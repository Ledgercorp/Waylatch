import { afterEach, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Server } from 'node:http';
import { createWebhookGateway } from '../server/webhook-gateway';
const servers: Server[] = [];
afterEach(async () => {
  for (const s of servers.splice(0)) await new Promise<void>((r) => s.close(() => r()));
});
const headers = {
  'paypal-transmission-id': 'synthetic-transmission',
  'paypal-transmission-time': '2026-10-13T12:00:00Z',
  'paypal-transmission-sig': 'synthetic-signature-not-real',
  'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/example',
  'paypal-auth-algo': 'SHA256withRSA',
};
async function setup(status = 200) {
  let calls = 0;
  let observed: { body: string; cookie?: string; authorization?: string } | undefined;
  const app = express();
  app.use(express.text({ type: 'application/json' }));
  app.post('/api/webhooks/paypal', (req, res) => {
    calls++;
    observed = {
      body: req.body,
      cookie: req.headers.cookie,
      authorization: req.headers.authorization,
    };
    res.status(status).json(status === 200 ? { verified: true } : { error: 'fixture failure' });
  });
  const s = await new Promise<Server>((r) => {
    const server = app.listen(0, '127.0.0.1', () => r(server));
  });
  servers.push(s);
  const gateway = createWebhookGateway(`http://127.0.0.1:${(s.address() as any).port}`);
  return { gateway, calls: () => calls, observed: () => observed };
}
it('forwards bounded callback bytes and signature headers, never browser credentials', async () => {
  const s = await setup();
  const body = '{ "id": "fixture-event", "event_type": "fixture" }';
  await request(s.gateway)
    .post('/api/webhooks/paypal')
    .set(headers)
    .set('Cookie', 'rl_session=fixture')
    .set('Authorization', 'Bearer fixture')
    .set('Content-Type', 'application/json')
    .send(body)
    .expect(200, { verified: true });
  expect(s.observed()).toEqual({ body, cookie: undefined, authorization: undefined });
});
it('exposes no coordinator, state, health, payment or static route', async () => {
  const s = await setup();
  for (const path of [
    '/',
    '/api/session',
    '/api/state',
    '/api/health',
    '/api/payments/x/capture',
  ]) {
    await request(s.gateway).get(path).expect(404);
    await request(s.gateway).post(path).send({ confirm: true }).expect(404);
  }
  await request(s.gateway).get('/api/webhooks/paypal').expect(404);
  await request(s.gateway).post('/api/webhooks/paypal?extra=1').set(headers).send({}).expect(404);
  expect(s.calls()).toBe(0);
});
it('rejects missing signature headers without calling the backend', async () => {
  const s = await setup();
  await request(s.gateway).post('/api/webhooks/paypal').send({ id: 'fixture' }).expect(400);
  expect(s.calls()).toBe(0);
});
it('rejects non-JSON and oversized bodies before backend verification', async () => {
  const s = await setup();
  await request(s.gateway).post('/api/webhooks/paypal').set(headers).send('text').expect(415);
  await request(s.gateway)
    .post('/api/webhooks/paypal')
    .set(headers)
    .send({ data: 'x'.repeat(50000) })
    .expect(413);
  expect(s.calls()).toBe(0);
});
it('retains verification rejection and retryable upstream failure status', async () => {
  for (const status of [400, 503]) {
    const s = await setup(status);
    const r = await request(s.gateway)
      .post('/api/webhooks/paypal')
      .set(headers)
      .send({ id: 'fixture' });
    expect(r.status).toBe(status);
    expect(r.body).not.toHaveProperty('verified');
  }
});
it('refuses external upstreams, URL credentials and non-origin targets', () => {
  for (const url of [
    'https://example.com',
    'http://localhost:4173',
    'http://user:pass@127.0.0.1:4173',
    'http://127.0.0.1:4173/path',
  ])
    expect(() => createWebhookGateway(url)).toThrow();
});
it('returns a retryable failure when the coordinator backend is unreachable', async () => {
  const s = await setup();
  const server = servers.pop()!;
  await new Promise<void>((r) => server.close(() => r()));
  await request(s.gateway)
    .post('/api/webhooks/paypal')
    .set(headers)
    .send({ id: 'fixture' })
    .expect(503);
});
it('refuses oversized signature headers without forwarding', async () => {
  const s = await setup();
  await request(s.gateway)
    .post('/api/webhooks/paypal')
    .set({ ...headers, 'paypal-transmission-sig': 'x'.repeat(4097) })
    .send({ id: 'fixture' })
    .expect(400);
  expect(s.calls()).toBe(0);
});
it('does not follow upstream redirects', async () => {
  const s = await setup(302);
  await request(s.gateway)
    .post('/api/webhooks/paypal')
    .set(headers)
    .send({ id: 'fixture' })
    .expect(502);
  expect(s.calls()).toBe(1);
});
