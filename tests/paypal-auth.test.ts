import { describe, expect, it } from 'vitest';
import { PayPalClient } from '../server/paypal';
describe('Sandbox OAuth contract — explicit local transport doubles', () => {
  it('fails closed before transport when credential bindings are missing', async () => {
    let calls = 0;
    const client = new PayPalClient({}, async () => {
      calls++;
      throw new Error('Transport should not execute');
    });
    await expect(client.authenticate()).rejects.toMatchObject({
      status: 503,
      code: 'SANDBOX_CREDENTIALS_MISSING',
    });
    expect(calls).toBe(0);
  });
  it('returns sanitized authentication evidence and never returns a token', async () => {
    const calls: any[] = [];
    const client = new PayPalClient(
      { clientId: 'synthetic-client', clientSecret: 'synthetic-secret' },
      async (url, options) => {
        calls.push({ url, options });
        return new Response(
          JSON.stringify({ access_token: 'synthetic-access-token-do-not-return', expires_in: 300 }),
          { status: 200 },
        );
      },
    );
    const result = await client.authenticate();
    expect(result).toEqual({
      authenticated: true,
      environment: 'sandbox',
      host: 'api-m.sandbox.paypal.com',
      httpStatus: 200,
    });
    expect(JSON.stringify(result)).not.toContain('synthetic-access-token');
    expect(calls).toHaveLength(1);
    expect(String(calls[0].url)).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token');
    expect(calls[0].options.body).toBe('grant_type=client_credentials');
  });
  it('distinguishes actual HTTP credential rejection from environment-key validation', async () => {
    const client = new PayPalClient(
      { clientId: 'synthetic-invalid', clientSecret: 'synthetic-invalid' },
      async () => new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401 }),
    );
    await expect(client.authenticate()).rejects.toMatchObject({
      status: 401,
      code: 'SANDBOX_OAUTH_FAILED',
    });
  });
});
