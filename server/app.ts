import express from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { RequestSchema, description } from '../src/requests/schema';
import { validateChain } from '../src/audit/chain';
import { Store } from './store';
import { Conflict, Payments } from './payments';
import type { PayPalProvider } from './paypal';
import {
  isLoopbackHost,
  judgeDemoMetadata,
  loadJudgeArchive,
  type JudgeArchive,
} from './judge-demo';
const hash = (x: string) => createHash('sha256').update(x).digest('hex');
const confirmed = z.strictObject({ confirm: z.literal(true) });
export function createApp({
  store,
  paypal,
  password,
  origin,
  judgeMode = false,
  judgeArchive,
  judgeEvidenceOnly = false,
  publicJudge = false,
  riskAssessment,
}: {
  store: Store;
  paypal: PayPalProvider;
  password: string;
  origin: string;
  judgeMode?: boolean;
  judgeArchive?: JudgeArchive;
  judgeEvidenceOnly?: boolean;
  publicJudge?: boolean;
  riskAssessment?: typeof import('../src/risk/review-quality').assessReviewQuality;
}) {
  if (password.length < 12)
    throw new Error('COORDINATOR_PASSWORD must have at least 12 characters');
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/')
    throw new Error('APP_ORIGIN must be an origin');
  if (publicJudge && (!judgeMode || (url.protocol !== 'https:' && !isLoopbackHost(url.host))))
    throw new Error('Public judge requires judge isolation and HTTPS');
  if (judgeMode && !publicJudge && !isLoopbackHost(url.host))
    throw new Error('Judge demo requires a loopback origin');
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '48kb' }));
  const payments = new Payments(store, paypal, origin);
  if (!judgeMode) payments.recoverInterrupted();
  app.use((_req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
    });
    next();
  });
  const token = (req: express.Request) => {
    const match = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('rl_session='));
    return match?.slice(11) ?? '';
  };
  app.use('/api', (req, res, next) => {
    if (
      req.method !== 'GET' &&
      req.path !== '/webhooks/paypal' &&
      req.headers.origin &&
      req.headers.origin !== origin
    ) {
      res.status(403).json({ error: 'Foreign origin rejected' });
      return;
    }
    next();
  });
  if (judgeMode) {
    const demo = judgeDemoMetadata(judgeArchive ?? loadJudgeArchive());
    app.get('/api/demo', (_req, res) => res.json({ ...demo, evidenceOnly: judgeEvidenceOnly }));
    app.post('/api/demo/session', (req, res) => {
      if (
        req.headers.origin !== origin ||
        req.headers.host !== url.host ||
        !isLoopbackHost(req.headers.host)
      ) {
        res
          .status(403)
          .json({ error: 'Judge demo session requires the exact loopback origin and host' });
        return;
      }
      z.strictObject({}).parse(req.body);
      const session = randomBytes(32).toString('hex');
      store.session(hash(session), Date.now() + 8 * 60 * 60 * 1000);
      res.setHeader(
        'Set-Cookie',
        `rl_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol === 'https:' ? '; Secure' : ''}`,
      );
      res.json({ authenticated: true, mode: 'judge', financialMutationsAllowed: false });
    });
    app.use('/api', (req, res, next) => {
      const path = req.path.toLowerCase().replace(/\/+$/, '');
      if (
        path === '/webhooks/paypal' ||
        path.startsWith('/payments/') ||
        (req.method === 'POST' && /^\/(requests|claims)\/[^/]+\/approve$/.test(path))
      ) {
        res.status(403).json({
          error: 'Judge demo blocks financial approvals and all payment provider operations',
        });
        return;
      }
      next();
    });
  }
  let attempts = new Map<string, { count: number; start: number }>();
  app.post('/api/session', (req, res) => {
    const key = req.ip ?? 'local';
    let a = attempts.get(key);
    if (!a || Date.now() - a.start > 60000) {
      a = { count: 0, start: Date.now() };
      if (attempts.size > 1000) attempts = new Map();
      attempts.set(key, a);
    }
    if (++a.count > 10) {
      res.status(429).json({ error: 'Wait before another login attempt' });
      return;
    }
    const input = z.strictObject({ password: z.string().max(512) }).parse(req.body);
    const check = Buffer.from(hash(input.password));
    if (!timingSafeEqual(check, Buffer.from(hash(password)))) {
      res.status(401).json({ error: 'Coordinator passphrase rejected' });
      return;
    }
    const session = randomBytes(32).toString('hex');
    store.session(hash(session), Date.now() + 8 * 60 * 60 * 1000);
    res.setHeader(
      'Set-Cookie',
      `rl_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol === 'https:' ? '; Secure' : ''}`,
    );
    res.json({ authenticated: true });
  });
  app.get('/api/health', (_req, res) =>
    res.json({
      environment: 'sandbox',
      paypalConfigured: judgeMode ? false : paypal.configured,
      payouts: 'blocked-unverified',
      ai: 'local-assets-required',
    }),
  );
  app.post('/api/webhooks/paypal', async (req, res) => {
    const event = z
      .object({
        id: z.string().min(1).max(100),
        event_type: z.string().max(100),
        resource: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(req.body);
    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k, typeof v === 'string' ? v : undefined]),
    );
    if (!(await paypal.verifyWebhook(headers, req.body))) {
      res.status(400).json({ error: 'Webhook signature not verified' });
      return;
    }
    if (store.webhookProcessed(event.id)) {
      res.json({ duplicate: true });
      return;
    }
    // Signed events are recorded. Authoritative order inspection must still confirm financial state.
    if (!store.webhookSeen(event.id))
      store.atomic(() => {
        store.markWebhook(event.id);
        store.append('webhook_verified', null, {
          eventId: event.id,
          eventType: event.event_type,
          environment: 'sandbox',
        });
      });
    const related = (event.resource?.supplementary_data as any)?.related_ids?.order_id;
    const p = store.payments().find((x) => x.orderId === related);
    if (p) await payments.inspect(p.recordId);
    store.atomic(() => store.markWebhookProcessed(event.id));
    res.json({ verified: true });
  });
  app.use('/api', (req, res, next) => {
    if (!store.authenticated(hash(token(req)))) {
      res.status(401).json({ error: 'Coordinator sign-in required' });
      return;
    }
    next();
  });
  app.delete('/api/session', (req, res) => {
    store.logout(hash(token(req)));
    res.setHeader('Set-Cookie', 'rl_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    res.json({ authenticated: false });
  });
  app.get('/api/state', (_req, res) =>
    res.json({
      records: store.records(),
      payments: store.payments(),
      events: store.events(),
      chain: validateChain(store.events()),
    }),
  );
  app.post('/api/requests', (req, res) => {
    const input = z
      .strictObject({ record: RequestSchema, provenance: z.enum(['local', 'qr']) })
      .parse(req.body);
    const existing = store.record(input.record.id);
    if (existing) {
      if (JSON.stringify(existing.record) === JSON.stringify(input.record)) {
        res.json(existing);
        return;
      }
      if (store.payment(input.record.id) || input.record.revision <= existing.record.revision)
        throw new Conflict('Revision conflict or financial record frozen');
    }
    const row = {
      record: input.record,
      provenance: input.provenance,
      status: 'pending' as const,
      reviewNote: null,
    };
    store.atomic(() => {
      store.putRecord(row);
      store.append(
        input.record.kind === 'claim'
          ? 'claim_submitted'
          : input.provenance === 'qr'
            ? 'request_imported'
            : 'request_created',
        input.record.id,
        { revision: input.record.revision, provenance: input.provenance, record: input.record },
      );
    });
    res.status(201).json(row);
  });
  app.post('/api/requests/:id/relationships', (req, res) => {
    const input = z
      .strictObject({
        candidateId: z.string().regex(/^[a-zA-Z0-9_-]{6,48}$/),
        revision: z.number().int().min(1).max(1000000),
        candidateRevision: z.number().int().min(1).max(1000000),
        disposition: z.enum(['related', 'unrelated', 'investigate']),
        note: z.string().trim().min(3).max(1000),
      })
      .parse(req.body);
    const row = store.record(req.params.id);
    const candidate = store.record(input.candidateId);
    if (
      !row ||
      !candidate ||
      row.record.id === candidate.record.id ||
      row.record.revision !== input.revision ||
      candidate.record.revision !== input.candidateRevision
    )
      throw new Conflict('Both distinct requests must exist at the specified revisions');
    const event = store.atomic(() =>
      store.append('pair_disposition_recorded', row.record.id, input),
    );
    res.status(201).json(event);
  });
  app.post('/api/requests/:id/review', (req, res) => {
    const input = z
      .strictObject({
        revision: z.number().int(),
        disposition: z.enum(['clear', 'hold']),
        note: z.string().trim().min(3).max(1000),
      })
      .parse(req.body);
    const row = store.record(req.params.id);
    if (
      !row ||
      row.record.revision !== input.revision ||
      store.payment(req.params.id) ||
      row.status === 'approved' ||
      row.status === 'reimbursement-approved'
    )
      throw new Conflict('Record cannot be reviewed in this state');
    row.status = input.disposition === 'clear' ? 'reviewed' : 'held';
    row.reviewNote = input.note;
    store.atomic(() => {
      store.putRecord(row);
      store.append('human_review_completed', row.record.id, input);
    });
    res.json(row);
  });
  app.post('/api/requests/:id/approve', (req, res) => {
    const input = z
      .strictObject({
        revision: z.number().int(),
        amountCents: z.number().int(),
        confirm: z.literal(true),
      })
      .parse(req.body);
    const row = store.record(req.params.id);
    if (
      !row ||
      row.status !== 'reviewed' ||
      row.record.kind !== 'procurement' ||
      row.record.revision !== input.revision ||
      row.record.amountKind !== 'exact' ||
      row.record.amountCents !== input.amountCents ||
      !row.record.incident ||
      row.record.resources.some((x) => x.quantity === null)
    )
      throw new Conflict('Reviewed exact procurement with known incident and quantities required');
    row.status = 'approved';
    store.atomic(() => {
      store.putRecord(row);
      store.append('purchase_approved', row.record.id, {
        revision: row.record.revision,
        amountCents: row.record.amountCents,
        confirmation: true,
      });
    });
    res.json(row);
  });
  app.post('/api/claims/:id/approve', (req, res) => {
    confirmed.parse(req.body);
    const row = store.record(req.params.id);
    if (
      !row ||
      row.record.kind !== 'claim' ||
      row.status !== 'reviewed' ||
      !row.record.expenseAt ||
      !row.record.receiptDigest ||
      row.record.amountKind !== 'exact'
    )
      throw new Conflict('Reviewed documented claim required');
    row.status = 'reimbursement-approved';
    store.atomic(() => {
      store.putRecord(row);
      store.append('reimbursement_approved', row.record.id, {
        payout: 'blocked-unverified',
        confirmation: true,
      });
    });
    res.json({
      claim: row,
      payout: 'blocked-unverified',
      message: 'Human approval recorded; no Payouts API call made',
    });
  });
  app.post('/api/payments/:id/order', async (req, res) => {
    confirmed.parse(req.body);
    res.json(await payments.order(req.params.id));
  });
  app.post('/api/payments/:id/capture', async (req, res) => {
    confirmed.parse(req.body);
    res.json(await payments.capture(req.params.id));
  });
  app.get('/api/payments/:id', async (req, res) => res.json(await payments.inspect(req.params.id)));
  app.post('/api/risk/:id', async (req, res) => {
    z.strictObject({}).parse(req.body);
    const row = store.record(req.params.id);
    if (!row) throw new Conflict('Unknown request');
    const assessReviewQuality =
      riskAssessment ?? (await import('../src/risk/review-quality')).assessReviewQuality;
    const map = (r: typeof row) => ({
      id: r.record.id,
      incident: r.record.incident,
      description: description(r.record),
      location: r.record.location,
      expenseAt: r.record.expenseAt,
      amountKind: r.record.amountKind,
      amountCents: r.record.amountCents,
      receiptDigest: r.record.receiptDigest,
      transactionReference: r.record.transactionReference,
      createdAt: r.record.createdAt,
    });
    const candidates = store
      .records()
      .filter((r) => r.record.id !== row.record.id)
      .slice(0, 100);
    const result = await assessReviewQuality(map(row), candidates.map(map));
    const evidence = {
      ...result,
      revision: row.record.revision,
      assessedRevisions: Object.fromEntries(
        [row, ...candidates].map((r) => [r.record.id, r.record.revision]),
      ),
    };
    store.atomic(() => store.append('risk_assessment_produced', row.record.id, evidence));
    res.json(evidence);
  });
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Input validation failed',
          fields: error.issues.map((i) => i.path.join('.')),
        });
        return;
      }
      if (error instanceof Conflict) {
        res.status(409).json({ error: error.message });
        return;
      }
      if ((error as { type?: string })?.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Malformed JSON input' });
        return;
      }
      if ((error as any)?.type === 'entity.too.large') {
        res.status(413).json({ error: 'Request too large' });
        return;
      }
      res.status(502).json({
        error: 'Operation interrupted or provider unavailable; inspect current state before retry',
      });
    },
  );
  return app;
}
