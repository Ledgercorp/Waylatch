import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { request as httpRequest } from 'node:http';
import { createPublicJudge } from '../server/public-judge';
import { demoRequest } from '../src/requests/schema';

const fake = vi.hoisted(() => ({ assess: vi.fn() }));
vi.mock('../src/risk/review-quality', () => ({ assessReviewQuality: fake.assess }));
const origin = 'https://waylatch.example';
const hosts: ReturnType<typeof createPublicJudge>[] = [];
beforeEach(() => {
  fake.assess.mockReset().mockImplementation(async (_record, candidates) => ({
    mode: 'deterministic-only',
    model: null,
    candidates,
  }));
});
afterEach(() => {
  for (const host of hosts.splice(0)) host.close();
});
function setup(options: Parameters<typeof createPublicJudge>[0] = { origin }) {
  const host = createPublicJudge({ renderEdge: true, ...options });
  hosts.push(host);
  return host;
}
function call(
  host: ReturnType<typeof setup>,
  method: 'get' | 'post' | 'delete',
  path: string,
  cookie?: string,
) {
  const req = request(host.app)[method](path).set('Host', 'waylatch.example').set('Origin', origin);
  if (cookie) req.set('Cookie', cookie);
  return req;
}
async function start(host: ReturnType<typeof setup>, ip = '192.0.2.1', cookie?: string) {
  const response = await call(host, 'post', '/api/demo/session', cookie)
    .set('X-Forwarded-For', ip)
    .set('CF-Connecting-IP', ip.split(',').at(-1)!.trim())
    .send({})
    .expect(200);
  return { cookie: response.headers['set-cookie']?.[0]?.split(';')[0] ?? cookie!, response };
}
describe('public judge trust boundary', () => {
  it('keeps one source bucket across rotating Render proxy hops and forged forwarded prefixes', async () => {
    const host = setup();
    for (const [index, expected] of [
      [1, 200],
      [2, 200],
      [3, 429],
    ] as const)
      await call(host, 'post', '/api/demo/session')
        .set('CF-Connecting-IP', '203.0.113.90')
        .set('X-Forwarded-For', `192.0.2.${index}, 203.0.113.90, 10.0.0.${index}, 10.1.0.${index}`)
        .set('X-Real-IP', `198.51.100.${index}`)
        .set('Forwarded', `for=192.0.2.${index}`)
        .send({})
        .expect(expected);
  });
  it('does not trust XFF when the Render client header is missing or invalid', async () => {
    for (const clientHeader of ['', 'unknown', '192.0.2.1, 192.0.2.2']) {
      const host = setup();
      for (const [index, expected] of [
        [1, 200],
        [2, 200],
        [3, 429],
      ] as const)
        await call(host, 'post', '/api/demo/session')
          .set('CF-Connecting-IP', clientHeader)
          .set('X-Forwarded-For', `192.0.2.${index}`)
          .send({})
          .expect(expected);
    }
  });
  it('keeps the request rate bucket stable while forwarded prefixes and proxy hops change', async () => {
    const host = setup({ origin, renderEdge: true, limits: { requestsPerMinute: 2 } });
    for (const [index, expected] of [
      [1, 200],
      [2, 200],
      [3, 429],
    ] as const)
      await call(host, 'get', '/api/health')
        .set('CF-Connecting-IP', '203.0.113.90')
        .set('X-Forwarded-For', `192.0.2.${index}, 203.0.113.90, 10.0.0.${index}`)
        .expect(expected);
  });
  it('ignores forged forwarded prefixes and ignores all forwarded addresses without the Render opt-in', async () => {
    for (const renderEdge of [true, false]) {
      const host = setup({ origin, renderEdge });
      await start(host, '192.0.2.11, 203.0.113.90');
      await start(host, '198.51.100.12, 203.0.113.90');
      await call(host, 'post', '/api/demo/session')
        .set('X-Forwarded-For', '192.0.2.13, 203.0.113.90')
        .set('CF-Connecting-IP', '203.0.113.90')
        .send({})
        .expect(429);
    }
  });
  it('uses fixed-lifetime secure anonymous sessions and refuses login or foreign/missing origins', async () => {
    const host = setup();
    const a = await start(host);
    expect(a.response.headers['set-cookie'][0]).toMatch(/^__Host-waylatch_demo=/);
    expect(a.response.headers['set-cookie'][0]).toContain(
      'HttpOnly; Secure; SameSite=Strict; Path=/',
    );
    expect((await start(host, '192.0.2.1', a.cookie)).response.body.expiresAt).toBe(
      a.response.body.expiresAt,
    );
    await request(host.app)
      .post('/api/demo/session')
      .set('Host', 'waylatch.example')
      .send({})
      .expect(403);
    await request(host.app)
      .post('/api/demo/session')
      .set('Host', 'waylatch.example')
      .set('Origin', 'https://evil.example')
      .send({})
      .expect(403);
    await call(host, 'post', '/api/session', a.cookie).send({ password: 'anything' }).expect(403);
    await call(host, 'post', '/api/demo/session').send({ password: 'anything' }).expect(400);
    await request(host.app)
      .get('/api/state')
      .set('Host', 'evil.example')
      .set('Cookie', a.cookie)
      .expect(403);
  });
  it('isolates records, review notes, risk candidates and audit exports across independent visitors', async () => {
    const host = setup();
    const a = await start(host);
    const b = await start(host, '192.0.2.2');
    const record = {
      ...demoRequest,
      id: 'RL-PRIVATE-A',
      resources: [{ description: 'Visitor A private fictional delivery', quantity: 2 }],
    };
    await call(host, 'post', '/api/requests', a.cookie)
      .send({ record, provenance: 'local' })
      .expect(201);
    await call(host, 'post', '/api/requests/RL-PRIVATE-A/review', a.cookie)
      .send({ revision: 1, disposition: 'hold', note: 'Visitor A alone' })
      .expect(200);
    await call(host, 'post', '/api/requests/RL-PRIVATE-A/review', b.cookie)
      .send({ revision: 1, disposition: 'hold', note: 'Forbidden cross-visitor change' })
      .expect(409);
    await call(host, 'post', '/api/risk/RL-PRIVATE-A', b.cookie).send({}).expect(409);
    await call(host, 'post', '/api/risk/RL-JUDGE-WATER-A', b.cookie).send({}).expect(200);
    const stateA = (await call(host, 'get', '/api/state', a.cookie)).body;
    const stateB = (await call(host, 'get', '/api/state', b.cookie)).body;
    expect(JSON.stringify(stateB)).not.toContain('Visitor A');
    expect(stateA.records.some((r: any) => r.record.id === 'RL-PRIVATE-A')).toBe(true);
    expect(stateA.payments).toEqual([]);
    expect(stateB.payments).toEqual([]);
    await call(host, 'delete', '/api/demo/session', b.cookie).expect(200);
    await call(host, 'get', '/api/state', b.cookie).expect(401);
    expect((await call(host, 'get', '/api/state', a.cookie)).body).toEqual(stateA);
  });
  it('blocks every equivalent financial/provider path even without a session', async () => {
    const host = setup();
    for (const path of [
      '/api/payments/RL-JUDGE-WATER-A/order',
      '/api/payments/RL-JUDGE-WATER-A/capture',
      '/api/requests/RL-JUDGE-WATER-A/approve',
      '/api/claims/RL-JUDGE-CLAIM-A/approve',
      '/api/webhooks/paypal',
      '/api/PAYMENTS/RL-JUDGE-WATER-A/ORDER/',
    ])
      await call(host, 'post', path).send({ confirm: true }).expect(403);
    await call(host, 'get', '/api/payments/RL-JUDGE-WATER-A').expect(403);
    const metadata = (await call(host, 'get', '/api/demo')).body;
    expect(metadata.publicDemo).toBe(true);
    expect(metadata.archive.chain.valid).toBe(true);
    expect(metadata.archive.events).toHaveLength(7);
    expect(metadata.providerCallsAllowed).toBe(false);
  });
  it('expires sessions, bounds capacity and rejects oversized/invalid inputs without exposing errors', async () => {
    let clock = Date.now();
    const host = setup({ origin, now: () => clock, limits: { maxSessions: 2, maxRecords: 8 } });
    const a = await start(host);
    await start(host, '192.0.2.2');
    await call(host, 'post', '/api/demo/session')
      .set('X-Forwarded-For', '192.0.2.3')
      .set('CF-Connecting-IP', '192.0.2.3')
      .send({})
      .expect(503);
    await call(host, 'post', '/api/requests', a.cookie)
      .send({ record: { ...demoRequest, id: 'RL-EXTRA-A' }, provenance: 'local' })
      .expect(201);
    await call(host, 'post', '/api/requests', a.cookie)
      .send({ record: { ...demoRequest, id: 'RL-EXTRA-B' }, provenance: 'local' })
      .expect(429);
    await call(host, 'post', '/api/requests', a.cookie)
      .send({ enormous: 'x'.repeat(50000) })
      .expect(413);
    clock += 3600001;
    await call(host, 'get', '/api/state', a.cookie).expect(401);
    await start(host, '192.0.2.3');
  });
  it('admits only one inference and rate limits sessions', async () => {
    let finish!: (value: any) => void;
    fake.assess.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    let clock = Date.now();
    const host = setup({ origin, now: () => clock, limits: { riskPerMinute: 1 } });
    const a = await start(host);
    const b = await start(host, '192.0.2.2');
    const pending = call(host, 'post', '/api/risk/RL-JUDGE-WATER-A', a.cookie)
      .send({})
      .then((r) => r);
    await vi.waitFor(() => expect(fake.assess).toHaveBeenCalled());
    await call(host, 'post', '/api/risk/RL-JUDGE-WATER-A', b.cookie).send({}).expect(503);
    await call(host, 'delete', '/api/demo/session', a.cookie).expect(409);
    finish({ mode: 'deterministic-only', model: null, candidates: [] });
    expect((await pending).status).toBe(200);
    await call(host, 'post', '/api/risk/RL-JUDGE-WATER-A', a.cookie).send({}).expect(429);
    await start(host, '192.0.2.1');
    await call(host, 'post', '/api/demo/session')
      .set('X-Forwarded-For', '192.0.2.1')
      .set('CF-Connecting-IP', '192.0.2.1')
      .send({})
      .expect(429);
    clock += 3600001;
    await call(host, 'get', '/api/state', a.cookie).expect(401);
  });
  it('holds aborted inference through its audit append and defers expiry cleanup', async () => {
    let finish!: (value: any) => void;
    fake.assess.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    let clock = Date.now();
    const host = setup({ origin, now: () => clock });
    const a = await start(host);
    const b = await start(host, '192.0.2.2');
    const server = host.app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const port = (server.address() as { port: number }).port;
    const client = httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/risk/RL-JUDGE-WATER-A',
      method: 'POST',
      headers: {
        Host: 'waylatch.example',
        Origin: origin,
        Cookie: a.cookie,
        'Content-Type': 'application/json',
      },
    });
    client.on('error', () => {});
    client.end('{}');
    await vi.waitFor(() => expect(fake.assess).toHaveBeenCalled());
    client.destroy();
    await vi.waitFor(async () =>
      expect((await call(host, 'get', '/api/health')).body.inferences).toBe(1),
    );
    await call(host, 'delete', '/api/demo/session', a.cookie).expect(409);
    await call(host, 'post', '/api/risk/RL-JUDGE-WATER-A', b.cookie).send({}).expect(503);
    finish({ mode: 'deterministic-only', model: null, candidates: [] });
    await vi.waitFor(async () =>
      expect((await call(host, 'get', '/api/health')).body.inferences).toBe(0),
    );
    const state = (await call(host, 'get', '/api/state', a.cookie)).body;
    expect(JSON.stringify(state)).toContain('risk_assessment_produced');
    // Repeat across expiry: its private Store must stay open until the audit finishes.
    fake.assess.mockClear();
    const pending = call(host, 'post', '/api/risk/RL-JUDGE-WATER-A', a.cookie)
      .send({})
      .then((r) => r);
    await vi.waitFor(() => expect(fake.assess).toHaveBeenCalled());
    clock += 3600001;
    await call(host, 'get', '/api/state', a.cookie).expect(401);
    expect((await call(host, 'get', '/api/health')).body.inferences).toBe(1);
    finish({ mode: 'deterministic-only', model: null, candidates: [] });
    expect((await pending).status).toBe(200);
    expect((await call(host, 'get', '/api/health')).body.inferences).toBe(0);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
