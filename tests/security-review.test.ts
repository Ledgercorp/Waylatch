import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Store } from '../server/store';
import { createApp } from '../server/app';
import { demoRequest } from '../src/requests/schema';
import type { CreateOrder, Order, PayPalProvider } from '../server/paypal';

const stores: Store[] = [];
afterEach(() => {
  vi.useRealTimers();
  for (const store of stores.splice(0)) store.close();
});
function fixture() {
  const store = new Store(':memory:');
  stores.push(store);
  let body: CreateOrder;
  let status = 'CREATED';
  let failCreate = false;
  let failCapture = false;
  let failInspect = false;
  const createKeys: string[] = [];
  const captureKeys: string[] = [];
  let inspections = 0;
  const representation = (): Order => ({
    id: 'ORDER-SECURITY-TEST',
    status,
    purchase_units: [
      {
        custom_id: body.reference,
        amount: { currency_code: 'USD', value: (body.amountCents / 100).toFixed(2) },
        payments:
          status === 'COMPLETED'
            ? {
                captures: [
                  {
                    id: 'CAPTURE-SECURITY-TEST',
                    status: 'COMPLETED',
                    final_capture: true,
                    amount: { currency_code: 'USD', value: (body.amountCents / 100).toFixed(2) },
                  },
                ],
              }
            : undefined,
      },
    ],
    links: [
      {
        rel: 'approve',
        href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER-SECURITY-TEST',
      },
    ],
  });
  const api: PayPalProvider = {
    configured: true,
    async createOrder(input) {
      body = input;
      createKeys.push(input.requestId);
      if (failCreate) throw new Error('Local simulated create interruption');
      return representation();
    },
    async getOrder() {
      inspections++;
      if (failInspect) throw new Error('Local simulated inspection interruption');
      return representation();
    },
    async captureOrder(_id, key) {
      captureKeys.push(key);
      if (failCapture) throw new Error('Local simulated capture interruption');
      status = 'COMPLETED';
      return representation();
    },
    async verifyWebhook() {
      return true;
    }, // Explicit provider double; no real signature claim.
  };
  const app = createApp({
    store,
    paypal: api,
    password: 'security-test-only-passphrase',
    origin: 'http://127.0.0.1:4173',
  });
  return {
    app,
    store,
    api,
    createKeys,
    captureKeys,
    inspections: () => inspections,
    setStatus: (value: string) => {
      status = value;
    },
    setFailCreate: (value: boolean) => {
      failCreate = value;
    },
    setFailCapture: (value: boolean) => {
      failCapture = value;
    },
    setFailInspect: (value: boolean) => {
      failInspect = value;
    },
  };
}
async function approved(f: ReturnType<typeof fixture>) {
  const client = request.agent(f.app);
  await client.post('/api/session').send({ password: 'security-test-only-passphrase' }).expect(200);
  await client.post('/api/requests').send({ record: demoRequest, provenance: 'qr' }).expect(201);
  await client
    .post('/api/requests/RL-DEMO01/review')
    .send({
      revision: 1,
      disposition: 'clear',
      note: 'Human reviewed fictional quantities and exact amount',
    })
    .expect(200);
  await client
    .post('/api/requests/RL-DEMO01/approve')
    .send({ revision: 1, amountCents: demoRequest.amountCents, confirm: true })
    .expect(200);
  return client;
}
const webhook = {
  id: 'WEBHOOK-SECURITY-TEST',
  event_type: 'PAYMENT.CAPTURE.COMPLETED',
  resource: { supplementary_data: { related_ids: { order_id: 'ORDER-SECURITY-TEST' } } },
};

describe('adversarial financial review: local doubles only', () => {
  it('keeps the same create idempotency key through an interrupted provider request and app restart', async () => {
    const f = fixture();
    const client = await approved(f);
    f.setFailCreate(true);
    await client.post('/api/payments/RL-DEMO01/order').send({ confirm: true }).expect(502);
    f.setFailCreate(false);
    const restarted = createApp({
      store: f.store,
      paypal: f.api,
      password: 'security-test-only-passphrase',
      origin: 'http://127.0.0.1:4173',
    });
    const loggedIn = request.agent(restarted);
    await loggedIn
      .post('/api/session')
      .send({ password: 'security-test-only-passphrase' })
      .expect(200);
    await loggedIn.post('/api/payments/RL-DEMO01/order').send({ confirm: true }).expect(200);
    expect(f.createKeys).toHaveLength(2);
    expect(new Set(f.createKeys).size).toBe(1);
  });
  it('freezes approved amount/revision once an order exists and rejects payload amount override', async () => {
    const f = fixture();
    const client = await approved(f);
    await client.post('/api/payments/RL-DEMO01/order').send({ confirm: true }).expect(200);
    await client
      .post('/api/requests')
      .send({ record: { ...demoRequest, revision: 2, amountCents: 1 }, provenance: 'local' })
      .expect(409);
    await client
      .post('/api/payments/RL-DEMO01/capture')
      .send({ confirm: true, amountCents: 1 })
      .expect(400);
    expect(f.store.payment('RL-DEMO01')?.amountCents).toBe(12800);
    expect(f.captureKeys).toHaveLength(0);
  });
  it('does not retry capture beyond five hours from the first uncertain capture attempt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const start = new Date('2026-10-13T00:00:00.000Z');
    vi.setSystemTime(start);
    const f = fixture();
    const client = await approved(f);
    await client.post('/api/payments/RL-DEMO01/order').send({ confirm: true }).expect(200);
    f.setStatus('APPROVED');
    f.setFailCapture(true);
    await client.post('/api/payments/RL-DEMO01/capture').send({ confirm: true }).expect(502);
    vi.setSystemTime(new Date(start.getTime() + 4 * 60 * 60 * 1000));
    await client.post('/api/payments/RL-DEMO01/capture').send({ confirm: true }).expect(502);
    expect(new Set(f.captureKeys).size).toBe(1);
    vi.setSystemTime(new Date(start.getTime() + 6 * 60 * 60 * 1000));
    const expired = await client.post('/api/payments/RL-DEMO01/capture').send({ confirm: true });
    expect(expired.status).toBe(409);
    expect(f.captureKeys).toHaveLength(2);
  });
  it('retries signed webhook reconciliation after a provider interruption, then deduplicates completed delivery', async () => {
    const f = fixture();
    const client = await approved(f);
    await client.post('/api/payments/RL-DEMO01/order').send({ confirm: true }).expect(200);
    f.setStatus('COMPLETED');
    f.setFailInspect(true);
    await request(f.app).post('/api/webhooks/paypal').send(webhook).expect(502);
    f.setFailInspect(false);
    await request(f.app).post('/api/webhooks/paypal').send(webhook).expect(200);
    expect(f.store.payment('RL-DEMO01')?.state).toBe('PAID');
    expect(f.inspections()).toBe(2);
    const duplicate = await request(f.app).post('/api/webhooks/paypal').send(webhook).expect(200);
    expect(duplicate.body.duplicate).toBe(true);
    expect(f.inspections()).toBe(2);
    expect(f.store.events().filter((event) => event.type === 'webhook_verified')).toHaveLength(1);
  });
});
