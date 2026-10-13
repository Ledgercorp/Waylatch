import { afterEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import request from 'supertest';
import { Store } from '../server/store';
import { PayPalClient } from '../server/paypal';
import { createApp } from '../server/app';
import { demoRequest } from '../src/requests/schema';
const children: ChildProcess[] = [];
const stores: Store[] = [];
afterEach(async () => {
  for (const store of stores.splice(0)) store.close();
  for (const child of children.splice(0)) {
    child.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      child.once('exit', () => resolve());
      setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 1000).unref();
    });
  }
});
async function setup() {
  const child = spawn(process.execPath, ['--import', 'tsx', 'tests/fixtures/paypal-simulator.ts'], {
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  children.push(child);
  const port = await new Promise<number>((resolve, reject) => {
    child.once('message', (message: any) => resolve(message.port));
    child.once('error', reject);
    child.once('exit', () => reject(new Error('Simulator exited before ready')));
  });
  const simulator = `http://127.0.0.1:${port}`;
  const transport: typeof fetch = (url, options) => {
    const parsed = new URL(String(url));
    if (parsed.origin !== PayPalClient.base) throw new Error('Forbidden non-Sandbox destination');
    return fetch(simulator + parsed.pathname, options);
  };
  const provider = new PayPalClient(
    { clientId: 'sim-client', clientSecret: 'sim-secret', webhookId: 'sim-webhook' },
    transport,
  );
  const store = new Store(':memory:');
  stores.push(store);
  const app = createApp({
    store,
    paypal: provider,
    password: 'http-test-passphrase',
    origin: 'http://127.0.0.1:4173',
  });
  const agent = request.agent(app);
  await agent.post('/api/session').send({ password: 'http-test-passphrase' }).expect(200);
  await agent.post('/api/requests').send({ record: demoRequest, provenance: 'qr' }).expect(201);
  await agent
    .post('/api/requests/RL-DEMO01/review')
    .send({ revision: 1, disposition: 'clear', note: 'Synthetic record verified' })
    .expect(200);
  await agent
    .post('/api/requests/RL-DEMO01/approve')
    .send({ revision: 1, amountCents: 12800, confirm: true })
    .expect(200);
  return {
    agent,
    store,
    app,
    control: (body: unknown) =>
      fetch(simulator + '/control', { method: 'POST', body: JSON.stringify(body) }),
    evidence: async () => await (await fetch(simulator + '/evidence')).json(),
  };
}
describe('black-box protocol boundary: separate-process PayPal simulator, NOT PayPal', () => {
  it('executes OAuth/order/buyer approval/capture/inspection without duplicate logical purchases', async () => {
    const f = await setup();
    await f.agent.post('/api/payments/RL-DEMO01/order').send({ confirm: true }).expect(200);
    await f.agent.post('/api/payments/RL-DEMO01/capture').send({ confirm: true }).expect(409);
    await f.control({ approved: true });
    await f.agent.post('/api/payments/RL-DEMO01/capture').send({ confirm: true }).expect(200);
    await f.agent.post('/api/payments/RL-DEMO01/capture').send({ confirm: true }).expect(200);
    const evidence = await f.evidence();
    expect(evidence.orderCount).toBe(1);
    expect(evidence.captureCount).toBe(1);
    expect(evidence.calls[0].body.purchase_units[0].amount.value).toBe('128.00');
    expect(f.store.payment('RL-DEMO01')?.captureId).toBe('HTTP-SIM-CAPTURE');
  });
  it('recovers a dropped create response with the same request ID', async () => {
    const f = await setup();
    await f.control({ dropCreate: true });
    await f.agent.post('/api/payments/RL-DEMO01/order').send({ confirm: true }).expect(502);
    await f.agent.post('/api/payments/RL-DEMO01/order').send({ confirm: true }).expect(200);
    const evidence = await f.evidence();
    expect(evidence.orderCount).toBe(1);
    const creates = evidence.calls.filter((x: any) => x.path === '/v2/checkout/orders');
    expect(new Set(creates.map((x: any) => x.requestId)).size).toBe(1);
  });
  it('reconciles a dropped successful capture response without another capture', async () => {
    const f = await setup();
    await f.agent.post('/api/payments/RL-DEMO01/order').send({ confirm: true }).expect(200);
    await f.control({ approved: true, dropCapture: true });
    await f.agent.post('/api/payments/RL-DEMO01/capture').send({ confirm: true }).expect(502);
    await f.agent.post('/api/payments/RL-DEMO01/capture').send({ confirm: true }).expect(200);
    expect((await f.evidence()).captureCount).toBe(1);
    expect(f.store.payment('RL-DEMO01')?.state).toBe('PAID');
  });
  it('forwards official verification fields and rejects an invalid signature over HTTP', async () => {
    const f = await setup();
    await request(f.app)
      .post('/api/webhooks/paypal')
      .set({
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/FAKE',
        'paypal-transmission-id': 'sim-id',
        'paypal-transmission-sig': 'invalid',
        'paypal-transmission-time': '2026-10-13T00:00:00Z',
      })
      .send({ id: 'SIM-EVENT', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} })
      .expect(400);
    const calls = (await f.evidence()).calls;
    const verified = calls.find(
      (x: any) => x.path === '/v1/notifications/verify-webhook-signature',
    );
    expect(verified.body.webhook_id).toBe('sim-webhook');
    expect(verified.body.transmission_sig).toBe('invalid');
    expect(f.store.events().some((e) => e.type === 'webhook_verified')).toBe(false);
  });
});
