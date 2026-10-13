import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createHash } from 'node:crypto';
import { Store } from '../server/store';
import { createApp } from '../server/app';
import { demoRequest } from '../src/requests/schema';
import type { PayPalProvider } from '../server/paypal';

const origin = 'http://127.0.0.1:4173';
const stores: Store[] = [];
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});
function setup(judgeMode = true) {
  const store = new Store(':memory:');
  stores.push(store);
  const calls: string[] = [];
  const paypal: PayPalProvider = {
    configured: true,
    createOrder: async () => {
      calls.push('create');
      throw new Error('unexpected provider operation');
    },
    captureOrder: async () => {
      calls.push('capture');
      throw new Error('unexpected provider operation');
    },
    getOrder: async () => {
      calls.push('inspect');
      throw new Error('unexpected provider operation');
    },
    verifyWebhook: async () => {
      calls.push('verify');
      return true;
    },
  };
  const app = createApp({ store, paypal, password: 'private-test-passphrase', origin, judgeMode });
  return { app, store, calls };
}
async function bootstrap(app: ReturnType<typeof createApp>) {
  const agent = request.agent(app);
  await agent
    .post('/api/demo/session')
    .set('Origin', origin)
    .set('Host', '127.0.0.1:4173')
    .send({})
    .expect(200);
  return agent;
}
describe('opt-in judge demo boundaries', () => {
  it('keeps demo bootstrap unavailable in normal mode', async () => {
    const { app } = setup(false);
    await request(app)
      .post('/api/demo/session')
      .set('Origin', origin)
      .set('Host', '127.0.0.1:4173')
      .send({})
      .expect(401);
    await request(app).get('/api/demo').expect(401);
  });
  it('requires exact origin and loopback host for bootstrap', async () => {
    const { app, store } = setup();
    for (const [headerOrigin, host] of [
      [undefined, '127.0.0.1:4173'],
      [origin, 'public.example'],
      ['http://localhost:4173', '127.0.0.1:4173'],
    ]) {
      const req = request(app).post('/api/demo/session').set('Host', host!);
      if (headerOrigin) req.set('Origin', headerOrigin);
      await req.send({}).expect(403);
    }
    expect(store.db.prepare('SELECT COUNT(*) AS n FROM sessions').get()?.n).toBe(0);
  });
  it('creates a normal hashed cookie session for fictional request work', async () => {
    const { app, store } = setup();
    const result = await request(app)
      .post('/api/demo/session')
      .set('Origin', origin)
      .set('Host', '127.0.0.1:4173')
      .send({})
      .expect(200);
    const cookie = result.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly; SameSite=Strict; Path=/');
    const session = cookie.split(';')[0].slice('rl_session='.length);
    expect(store.authenticated(createHash('sha256').update(session).digest('hex'))).toBe(true);
    expect(store.authenticated(session)).toBe(false);
    const agent = await bootstrap(app);
    await agent
      .post('/api/requests')
      .send({ record: demoRequest, provenance: 'local' })
      .expect(201);
    await agent
      .post(`/api/requests/${demoRequest.id}/review`)
      .send({ revision: 1, disposition: 'hold', note: 'Fictional human review' })
      .expect(200);
  });
  it('blocks every financial and provider route even with a configured provider', async () => {
    const { app, store, calls } = setup();
    const agent = await bootstrap(app);
    await agent
      .post('/api/requests')
      .send({ record: demoRequest, provenance: 'local' })
      .expect(201);
    const before = store.events();
    for (const path of [
      `/api/requests/${demoRequest.id}/approve`,
      `/api/claims/${demoRequest.id}/approve`,
      `/api/payments/${demoRequest.id}/order`,
      `/api/payments/${demoRequest.id}/capture`,
    ]) {
      await agent.post(path).send({ confirm: true, revision: 1, amountCents: 12800 }).expect(403);
    }
    await agent.get(`/api/payments/${demoRequest.id}`).expect(403);
    await request(app)
      .post('/api/webhooks/paypal')
      .send({ id: 'event', event_type: 'PAYMENT.CAPTURE.COMPLETED' })
      .expect(403);
    expect(calls).toEqual([]);
    expect(store.events()).toEqual(before);
    expect(store.payments()).toEqual([]);
    expect((await request(app).get('/api/health')).body.paypalConfigured).toBe(false);
  });
  it('shows the historical seven-event archive without inserting its payment into state', async () => {
    const { app, store } = setup();
    const result = await request(app).get('/api/demo').expect(200);
    expect(result.body.financialMutationsAllowed).toBe(false);
    expect(result.body.archive.historical).toBe(true);
    expect(result.body.archive.readonly).toBe(true);
    expect(result.body.archive.events).toHaveLength(7);
    expect(result.body.archive.chain).toEqual({ valid: true, brokenAt: null, count: 7 });
    expect(result.body.archive.payment.amountCents).toBe(100);
    expect(result.body.archive.providerEvidence.verifiedAt).toBe('2026-10-13T20:58:36.864Z');
    expect(store.records()).toEqual([]);
    expect(store.events()).toEqual([]);
    expect(store.payments()).toEqual([]);
    expect(JSON.stringify(result.body)).not.toMatch(
      /createKey|captureKey|approvalUrl|password|clientSecret/,
    );
  });
  it('blocks equivalent mixed-case and trailing-slash financial routes', async () => {
    const { app, store, calls } = setup();
    const agent = await bootstrap(app);
    for (const path of [
      '/api/REQUESTS/RL-DEMO01/APPROVE/',
      '/api/CLAIMS/RL-DEMO01/APPROVE/',
      '/api/PAYMENTS/RL-DEMO01/ORDER/',
      '/api/PAYMENTS/RL-DEMO01/CAPTURE/',
      '/api/WEBHOOKS/PAYPAL/',
    ])
      await agent.post(path).send({ confirm: true }).expect(403);
    expect(store.events()).toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe('human pair relationship audit', () => {
  it('requires coordinator authentication and current revisions for both existing requests', async () => {
    const { app, store } = setup(false);
    const candidate = { ...demoRequest, id: 'RL-CANDIDATE01' };
    for (const record of [demoRequest, candidate])
      store.putRecord({ record, provenance: 'local', status: 'pending', reviewNote: null });
    const path = `/api/requests/${demoRequest.id}/relationships`;
    const body = {
      candidateId: candidate.id,
      revision: 1,
      candidateRevision: 1,
      disposition: 'related',
      note: 'Same delivery needs field confirmation',
    };
    await request(app).post(path).send(body).expect(401);
    const agent = request.agent(app);
    await agent.post('/api/session').send({ password: 'private-test-passphrase' }).expect(200);
    await agent
      .post(path)
      .send({ ...body, candidateRevision: 2 })
      .expect(409);
    await agent
      .post(path)
      .send({ ...body, candidateId: 'RL-UNKNOWN01' })
      .expect(409);
    await agent
      .post(path)
      .send({ ...body, candidateId: demoRequest.id })
      .expect(409);
    await agent
      .post(path)
      .send({ ...body, note: '' })
      .expect(400);
    await agent.post(path).set('Origin', 'https://foreign.example').send(body).expect(403);
    expect(store.events()).toEqual([]);
  });
  it('appends a relationship event without changing review, authorization or payment state', async () => {
    const { app, store } = setup();
    const candidate = { ...demoRequest, id: 'RL-CANDIDATE01' };
    store.putRecord({
      record: demoRequest,
      provenance: 'local',
      status: 'approved',
      reviewNote: 'Existing frozen decision',
    });
    store.putRecord({
      record: candidate,
      provenance: 'local',
      status: 'pending',
      reviewNote: null,
    });
    const before = store.records();
    const agent = await bootstrap(app);
    for (const disposition of ['related', 'unrelated', 'investigate']) {
      const result = await agent
        .post(`/api/requests/${demoRequest.id}/relationships`)
        .send({
          candidateId: candidate.id,
          revision: 1,
          candidateRevision: 1,
          disposition,
          note: 'Human reviewed this fictional pair',
        })
        .expect(201);
      expect(result.body.type).toBe('pair_disposition_recorded');
      expect(result.body.data.disposition).toBe(disposition);
    }
    expect(store.records()).toEqual(before);
    expect(store.payments()).toEqual([]);
    expect(store.events()).toHaveLength(3);
  });
});
