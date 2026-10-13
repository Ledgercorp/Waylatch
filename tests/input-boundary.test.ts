import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import { Store } from '../server/store';
import { PayPalClient } from '../server/paypal';
describe('malformed external input', () => {
  it('classifies malformed JSON and oversized payloads without provider effects', async () => {
    const store = new Store(':memory:');
    const app = createApp({
      store,
      paypal: new PayPalClient({}),
      password: 'input-test-passphrase',
      origin: 'http://127.0.0.1:4173',
    });
    try {
      await request(app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send('{broken')
        .expect(400);
      await request(app)
        .post('/api/session')
        .send({ password: 'a'.repeat(50000) })
        .expect(413);
      expect(store.events()).toHaveLength(0);
    } finally {
      store.close();
    }
  });
  it('rejects malformed certificate URLs without calling the verification service', async () => {
    let calls = 0;
    const client = new PayPalClient(
      { clientId: 'fake', clientSecret: 'fake', webhookId: 'fake' },
      async () => {
        calls++;
        throw new Error('Unexpected service call');
      },
    );
    await expect(
      client.verifyWebhook(
        {
          'paypal-auth-algo': 'SHA256withRSA',
          'paypal-cert-url': 'not-a-url',
          'paypal-transmission-id': 'id',
          'paypal-transmission-sig': 'invalid',
          'paypal-transmission-time': '2026-10-13T00:00:00Z',
        },
        {},
      ),
    ).resolves.toBe(false);
    expect(calls).toBe(0);
  });
});
