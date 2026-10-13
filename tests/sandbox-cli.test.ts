import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { createApp } from '../server/app';
import { Store } from '../server/store';
import type { PayPalProvider } from '../server/paypal';
const servers: Server[] = [];
const stores: Store[] = [];
const children: ChildProcess[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) if (child.exitCode === null) child.kill('SIGTERM');
  for (const server of servers.splice(0))
    await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const store of stores.splice(0)) store.close();
});
async function run(cancelReview: boolean, aliasOnly = false) {
  const server = createServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const store = new Store(':memory:');
  stores.push(store);
  let financialCalls = 0;
  const blocked = async () => {
    financialCalls++;
    throw new Error('Forbidden financial action in cancellation test');
  };
  const provider: PayPalProvider = {
    configured: true,
    createOrder: blocked,
    getOrder: blocked,
    captureOrder: blocked,
    verifyWebhook: async () => false,
  };
  server.on(
    'request',
    createApp({ store, paypal: provider, password: 'cli-test-only-password', origin }),
  );
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/sandbox-integration.ts'], {
    env: {
      ...process.env,
      APP_ORIGIN: origin,
      PAYPAL_CLIENT_ID: 'cli-fixture-id',
      PAYPAL_CLIENT_SECRET: aliasOnly ? '' : 'cli-fixture-secret',
      PAYPAL_SECRET_KEY: aliasOnly ? 'cli-fixture-alias-secret' : '',
      COORDINATOR_PASSWORD: 'cli-test-only-password',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  children.push(child);
  let output = '';
  let reviewed = false;
  let replied = false;
  child.stdout!.on('data', (chunk) => {
    output += String(chunk);
    if (cancelReview && !replied && output.includes('Type ')) {
      replied = true;
      child.stdin!.end('DECLINE\n');
    } else if (!cancelReview && !reviewed && output.includes('Type REVIEW')) {
      reviewed = true;
      child.stdin!.write('REVIEW\n');
    } else if (!cancelReview && !replied && output.includes('Type AUTHORIZE')) {
      replied = true;
      child.stdin!.end('DECLINE\n');
    }
  });
  const code = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  return { store, financialCalls, output, code };
}
describe('interactive integration harness: local app/provider double, no real PayPal', () => {
  it('accepts an alias-only fixture but records no human decision when review is declined', async () => {
    const r = await run(true, true);
    expect(r.code).toBe(2);
    expect(r.store.records()).toHaveLength(1);
    expect(r.store.records()[0].status).toBe('pending');
    expect(r.financialCalls).toBe(0);
    expect(r.output).not.toContain('cli-fixture-alias-secret');
    expect(r.output).toContain('Type REVIEW');
  });
  it('preserves purchase authorization cancellation with alias-only credentials', async () => {
    const r = await run(false, true);
    expect(r.code).toBe(2);
    expect(r.store.records()).toHaveLength(1);
    expect(r.store.records()[0].status).toBe('reviewed');
    expect(r.store.events().some((e) => e.type === 'purchase_approved')).toBe(false);
    expect(r.financialCalls).toBe(0);
  });
  it('does not invent human review when the operator declines the first confirmation', async () => {
    const r = await run(true);
    expect(r.code).toBe(2);
    expect(r.store.records()).toHaveLength(1);
    expect(r.store.records()[0].status).toBe('pending');
    expect(r.store.events().some((e) => e.type === 'human_review_completed')).toBe(false);
    expect(r.financialCalls).toBe(0);
  });
  it('records explicit review but creates no order when purchase authorization is declined', async () => {
    const r = await run(false);
    expect(r.code).toBe(2);
    expect(r.output).toContain('Type REVIEW');
    expect(r.output).toContain('$1.00 SANDBOX');
    expect(r.store.records()[0].record.amountCents).toBe(100);
    expect(r.store.records()[0].status).toBe('reviewed');
    expect(r.store.events().some((e) => e.type === 'purchase_approved')).toBe(false);
    expect(r.financialCalls).toBe(0);
  });
});
