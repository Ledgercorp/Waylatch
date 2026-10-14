import express from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';
import { createApp } from './app';
import { Store } from './store';
import {
  isLoopbackHost,
  judgeDemoMetadata,
  loadJudgeArchive,
  newJudgePassphrase,
  seedJudgeStore,
} from './judge-demo';
import { RequestSchema, description } from '../src/requests/schema';
import { assessReviewQuality } from '../src/risk/review-quality';
import type { PayPalProvider } from './paypal';
import { MODEL_ID, MODEL_REVISION, modelMetrics } from '../src/risk/model';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const cookieName = '__Host-waylatch_demo';
const defaults = {
  maxSessions: 12,
  maxSessionsPerIp: 2,
  sessionTtlSeconds: 3600,
  maxRecords: 16,
  maxEvents: 64,
  maxStoreBytes: 512 * 1024,
  requestsPerMinute: 120,
  mutationsPerMinute: 20,
  riskPerMinute: 3,
  startsPerMinute: 4,
  globalRequestsPerMinute: 600,
  globalStartsPerMinute: 30,
};
type Session = {
  store: Store;
  app: ReturnType<typeof createApp>;
  expires: number;
  ip: string;
  active: number;
  inferenceRunning: boolean;
  finishInference?: () => void;
};

/** Dedicated anonymous demo boundary. Never creates a PayPal client or shares visitor stores. */
export function createPublicJudge({
  origin,
  now = Date.now,
  limits: overrides = {},
  renderEdge = false,
}: {
  origin: string;
  now?: () => number;
  limits?: Partial<typeof defaults>;
  renderEdge?: boolean;
}) {
  const url = new URL(origin);
  if (url.origin !== origin || (url.protocol !== 'https:' && !isLoopbackHost(url.host)))
    throw new Error('Public demo requires a canonical HTTPS origin (loopback allowed for tests)');
  const limits = { ...defaults, ...overrides };
  if (Object.values(limits).some((n) => !Number.isSafeInteger(n) || n < 1))
    throw new Error('Demo limits must be positive integers');
  const sessions = new Map<string, Session>();
  const rates = new Map<string, { minute: number; count: number }>();
  const archive = loadJudgeArchive();
  let inferences = 0;
  const app = express();
  app.disable('x-powered-by');
  // Render supplies the first verified X-Forwarded-For address. This opt-in is only for
  // its edge-only Free web service; direct/local deployments ignore forwarded headers.
  // Forwarded host/protocol never grant authority. Global caps do not depend on IP.
  const clientIp = (req: express.Request) => {
    const first = renderEdge ? req.get('X-Forwarded-For')?.split(',')[0]?.trim() : undefined;
    return hash(first && isIP(first) ? first : (req.socket.remoteAddress ?? 'unknown'));
  };
  const blocked = async (): Promise<never> => {
    throw new Error('Public demo provider disabled');
  };
  const paypal: PayPalProvider = {
    configured: false,
    createOrder: blocked,
    captureOrder: blocked,
    getOrder: blocked,
    verifyWebhook: blocked,
  };
  function cleanup() {
    for (const [key, session] of sessions)
      if (session.expires <= now() && session.active === 0) {
        sessions.delete(key);
        session.store.close();
      }
    const minute = Math.floor(now() / 60000);
    for (const [key, value] of rates) if (value.minute !== minute) rates.delete(key);
  }
  function allowance(key: string, cap: number) {
    const minute = Math.floor(now() / 60000);
    let rate = rates.get(key);
    if (!rate || rate.minute !== minute) {
      if (!rate && rates.size >= 512) return false;
      rate = { minute, count: 0 };
      rates.set(key, rate);
    }
    return ++rate.count <= cap;
  }
  const readToken = (req: express.Request) => {
    const value =
      req.headers.cookie
        ?.split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1) ?? '';
    return /^[a-f0-9]{64}$/.test(value) ? value : '';
  };
  function getSession(req: express.Request) {
    const session = sessions.get(hash(readToken(req)));
    return session && session.expires > now() ? session : undefined;
  }
  const reject = (res: express.Response, status: number, error: string) => {
    if (status === 429 || status === 503) res.set('Retry-After', '5');
    res.status(status).json({ error });
  };
  app.use((req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    });
    if (url.protocol === 'https:') res.set('Strict-Transport-Security', 'max-age=31536000');
    if (req.headers.host !== url.host) return reject(res, 403, 'Unexpected demo host');
    cleanup();
    if (!req.path.toLowerCase().startsWith('/api/')) return next();
    let path: string;
    try {
      path = decodeURIComponent(req.path).toLowerCase().replace(/\/+$/, '');
    } catch {
      return reject(res, 400, 'Invalid path');
    }
    // Deny before origin, body parsing or session lookup, including unauthenticated requests.
    if (
      path.startsWith('/api/payments/') ||
      path.startsWith('/api/webhooks/') ||
      /^\/api\/(requests|claims)\/[^/]+\/approve$/.test(path) ||
      path === '/api/session'
    )
      return reject(
        res,
        403,
        'Public judge blocks financial approvals and all provider operations',
      );
    if (
      (req.headers.origin && req.headers.origin !== origin) ||
      (req.method !== 'GET' && req.method !== 'HEAD' && req.headers.origin !== origin) ||
      req.headers['sec-fetch-site'] === 'cross-site'
    )
      return reject(res, 403, 'Exact demo origin required');
    const ip = clientIp(req);
    if (
      !allowance('global', limits.globalRequestsPerMinute) ||
      !allowance(`ip:${ip}`, limits.requestsPerMinute)
    )
      return reject(res, 429, 'Demo request limit reached; wait a minute');
    next();
  });
  app.use(express.json({ limit: '48kb' }));
  app.get('/api/demo', (_req, res) =>
    res.json({
      ...judgeDemoMetadata(archive),
      publicDemo: true,
      sessionTtlSeconds: limits.sessionTtlSeconds,
      limits: {
        records: limits.maxRecords,
        events: limits.maxEvents,
        simultaneousVisitors: limits.maxSessions,
      },
    }),
  );
  app.get('/api/health', (_req, res) =>
    res.json({
      environment: 'sandbox',
      paypalConfigured: false,
      publicDemo: true,
      providerCallsAllowed: false,
      sessions: sessions.size,
      inferences,
      model: MODEL_ID,
      revision: MODEL_REVISION,
      successfulInferenceBatches: modelMetrics.inferenceBatches,
      loadMilliseconds: modelMetrics.loadMilliseconds,
      rssBytes: process.memoryUsage().rss,
      uptimeSeconds: Math.round(process.uptime()),
    }),
  );
  app.post('/api/demo/session', (req, res) => {
    z.strictObject({}).parse(req.body);
    const existing = getSession(req);
    if (existing)
      return res.json({
        authenticated: true,
        mode: 'judge',
        expiresAt: existing.expires,
        financialMutationsAllowed: false,
      });
    const ip = clientIp(req);
    if (
      !allowance(`start:${ip}`, limits.startsPerMinute) ||
      [...sessions.values()].filter((s) => s.ip === ip).length >= limits.maxSessionsPerIp
    )
      return reject(res, 429, 'Demo session limit reached; reuse or reset your current session');
    if (!allowance('starts', limits.globalStartsPerMinute) || sessions.size >= limits.maxSessions)
      return reject(res, 503, 'Demo visitor capacity reached; please try again later');
    const token = randomBytes(32).toString('hex');
    const key = hash(token);
    const expires = now() + limits.sessionTtlSeconds * 1000;
    const store = seedJudgeStore(new Store(':memory:'));
    store.session(key, expires);
    const session: Session = { store, expires, ip, active: 0, inferenceRunning: false, app: null! };
    session.app = createApp({
      store,
      paypal,
      password: newJudgePassphrase(),
      origin,
      judgeMode: true,
      publicJudge: true,
      judgeArchive: archive,
      riskAssessment: async (...args) => {
        session.inferenceRunning = true;
        try {
          return await assessReviewQuality(...args);
        } finally {
          session.inferenceRunning = false;
          // The caller appends its audit event after awaiting this result. Drain after that microtask.
          setImmediate(() => session.finishInference?.());
        }
      },
    });
    sessions.set(key, session);
    res.set(
      'Set-Cookie',
      `${cookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${limits.sessionTtlSeconds}`,
    );
    res.json({
      authenticated: true,
      mode: 'judge',
      expiresAt: expires,
      financialMutationsAllowed: false,
    });
  });
  app.delete('/api/demo/session', (req, res) => {
    const session = getSession(req);
    if (session?.active)
      return reject(res, 409, 'Wait for the active demo operation before resetting');
    if (session) {
      sessions.delete(hash(readToken(req)));
      session.store.close();
    }
    res.set('Set-Cookie', `${cookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
    res.json({ authenticated: false });
  });
  app.use((req, res, next) => {
    if (!req.path.toLowerCase().startsWith('/api/')) return next();
    const allowed =
      (req.method === 'GET' && req.path === '/api/state') ||
      (req.method === 'POST' &&
        (req.path === '/api/requests' ||
          /^\/api\/requests\/[a-zA-Z0-9_-]{6,48}\/(review|relationships)$/.test(req.path) ||
          /^\/api\/risk\/[a-zA-Z0-9_-]{6,48}$/.test(req.path)));
    if (!allowed) return reject(res, 404, 'Demo endpoint unavailable');
    const session = getSession(req);
    if (!session) return reject(res, 401, 'Demo session expired; start a new fictional session');
    const key = hash(readToken(req));
    if (req.method === 'POST') {
      if (
        !allowance(`mutate:${key}`, limits.mutationsPerMinute) ||
        Number(session.store.db.prepare('SELECT COUNT(*) AS n FROM events').get()?.n) >=
          limits.maxEvents ||
        Number(session.store.db.prepare('PRAGMA page_count').get()?.page_count) *
          Number(session.store.db.prepare('PRAGMA page_size').get()?.page_size) >=
          limits.maxStoreBytes
      )
        return reject(res, 429, 'Fictional session capacity reached; reset the demo');
      if (req.path === '/api/requests') {
        const record = RequestSchema.parse(req.body?.record);
        if (description(record).length > 1000)
          return reject(res, 400, 'Demo request descriptions must total at most 1000 characters');
        if (!session.store.record(record.id) && session.store.records().length >= limits.maxRecords)
          return reject(res, 429, 'Fictional record limit reached; reset the demo');
      }
    }
    const risk = req.path.startsWith('/api/risk/');
    if (risk) {
      if (inferences) return reject(res, 503, 'Local AI is busy; retry shortly');
      if (!allowance(`risk:${key}`, limits.riskPerMinute))
        return reject(res, 429, 'AI review limit reached; wait a minute');
      inferences++;
    }
    session.active++;
    let finished = false,
      released = false;
    const release = () => {
      finished = true;
      if (released || session.inferenceRunning) return;
      released = true;
      session.active--;
      if (risk) {
        inferences--;
        session.finishInference = undefined;
      }
      cleanup();
    };
    if (risk)
      session.finishInference = () => {
        if (finished) release();
      };
    res.once('finish', release);
    res.once('close', release);
    // Existing coordinator authorization stays intact inside this visitor's private Store.
    req.headers.cookie = `rl_session=${readToken(req)}`;
    session.app(req, res, next);
  });
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const type = (error as { type?: string })?.type;
      reject(
        res,
        type === 'entity.too.large'
          ? 413
          : error instanceof z.ZodError || type === 'entity.parse.failed'
            ? 400
            : 500,
        type === 'entity.too.large' ? 'Request too large' : 'Demo input or operation unavailable',
      );
    },
  );
  const timer = setInterval(cleanup, 60000);
  timer.unref();
  return {
    app,
    close() {
      clearInterval(timer);
      for (const session of sessions.values()) {
        if (session.active) throw new Error('Drain public requests before closing');
        session.store.close();
      }
      sessions.clear();
    },
  };
}
