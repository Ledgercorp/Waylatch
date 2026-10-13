import { describe, expect, it } from 'vitest';
import { PayPalClient } from '../server/paypal';
import { paypalConfigFromEnv } from '../server/paypal-config';

// Synthetic credentials and local transport only; these tests never contact PayPal.
async function authenticate(environment: NodeJS.ProcessEnv, expectedSecret: string) {
  let calls = 0;
  const client = new PayPalClient(paypalConfigFromEnv(environment), async (url, options) => {
    calls++;
    expect(String(url)).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token');
    const authorization = new Headers(options?.headers).get('Authorization');
    expect(authorization).toBe(
      'Basic ' + Buffer.from(`synthetic-id:${expectedSecret}`).toString('base64'),
    );
    return new Response(JSON.stringify({ access_token: 'synthetic-token', expires_in: 300 }), {
      status: 200,
    });
  });
  const result = await client.authenticate();
  expect(calls).toBe(1);
  expect(result.authenticated).toBe(true);
  expect(JSON.stringify(result)).not.toContain(expectedSecret);
  expect(JSON.stringify(result)).not.toContain('synthetic-token');
}
describe('server-side PayPal configuration alias — local transport double', () => {
  it('continues accepting the canonical secret', async () => {
    await authenticate(
      { PAYPAL_CLIENT_ID: 'synthetic-id', PAYPAL_CLIENT_SECRET: 'synthetic-canonical' },
      'synthetic-canonical',
    );
  });
  it('prefers a nonempty canonical secret when both variables exist', async () => {
    await authenticate(
      {
        PAYPAL_CLIENT_ID: 'synthetic-id',
        PAYPAL_CLIENT_SECRET: 'synthetic-canonical',
        PAYPAL_SECRET_KEY: 'synthetic-alias',
      },
      'synthetic-canonical',
    );
  });
  it.each([undefined, ''])('uses the alias when canonical is %s', async (canonical) => {
    await authenticate(
      {
        PAYPAL_CLIENT_ID: 'synthetic-id',
        PAYPAL_CLIENT_SECRET: canonical,
        PAYPAL_SECRET_KEY: 'synthetic-alias',
      },
      'synthetic-alias',
    );
  });
  it('fails closed before transport when neither secret variable has a value', async () => {
    let calls = 0;
    const client = new PayPalClient(
      paypalConfigFromEnv({
        PAYPAL_CLIENT_ID: 'synthetic-id',
        PAYPAL_CLIENT_SECRET: '',
        PAYPAL_SECRET_KEY: '',
      }),
      async () => {
        calls++;
        throw new Error('Transport must not execute');
      },
    );
    await expect(client.authenticate()).rejects.toMatchObject({
      code: 'SANDBOX_CREDENTIALS_MISSING',
    });
    expect(calls).toBe(0);
  });
  it('reads without mutating caller environment or changing other configuration', () => {
    const environment = Object.freeze({
      PAYPAL_CLIENT_ID: 'synthetic-id',
      PAYPAL_CLIENT_SECRET: '',
      PAYPAL_SECRET_KEY: 'synthetic-alias',
      PAYPAL_WEBHOOK_ID: 'synthetic-webhook',
    });
    const config = paypalConfigFromEnv(environment);
    expect(config).toEqual({
      clientId: 'synthetic-id',
      clientSecret: 'synthetic-alias',
      webhookId: 'synthetic-webhook',
    });
    expect(environment.PAYPAL_CLIENT_SECRET).toBe('');
  });
});
