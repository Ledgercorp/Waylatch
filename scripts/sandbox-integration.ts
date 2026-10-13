import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { demoRequest } from '../src/requests/schema';
const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:4173';
if (
  !process.env.PAYPAL_CLIENT_ID ||
  !process.env.PAYPAL_CLIENT_SECRET ||
  !process.env.COORDINATOR_PASSWORD
) {
  console.log(
    'BLOCKED: securely configure Sandbox credentials and coordinator passphrase; no transaction executed.',
  );
  process.exit(2);
}
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
  throw new Error('Integration harness supports loopback only');
let cookie = '';
async function call(path: string, body?: unknown) {
  const response = await fetch(origin + '/api' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.headers.get('set-cookie'))
    cookie = response.headers.get('set-cookie')!.split(';')[0];
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Integration request failed');
  return data;
}
const health = await call('/health');
if (health.environment !== 'sandbox' || !health.paypalConfigured)
  throw new Error('Server Sandbox provider is not configured');
await call('/session', { password: process.env.COORDINATOR_PASSWORD });
const record = {
  ...demoRequest,
  id: 'RL-REAL-' + Date.now(),
  resources: [{ description: 'Fictional one-dollar Sandbox procurement test item', quantity: 1 }],
  amountCents: 100,
  createdAt: new Date().toISOString(),
};
await call('/requests', { record, provenance: 'local' });
const rl = createInterface({ input: stdin, output: stdout });
async function integrate() {
  console.log(
    'Synthetic procurement for human review:',
    JSON.stringify(
      {
        id: record.id,
        incident: record.incident,
        resources: record.resources,
        revision: record.revision,
        amountCents: record.amountCents,
        currency: record.currency,
      },
      null,
      2,
    ),
  );
  const reviewed = await rl.question(
    'Verify the fictional incident, supplies and exact amount. Type REVIEW to record human review: ',
  );
  if (reviewed !== 'REVIEW') {
    console.log('Stopped without human review; request remains pending.');
    process.exitCode = 2;
    return;
  }
  await call(`/requests/${record.id}/review`, {
    revision: 1,
    disposition: 'clear',
    note: 'Operator explicitly confirmed REVIEW for the displayed synthetic procurement',
  });
  const consent = await rl.question(
    `Authorize this synthetic $${(record.amountCents / 100).toFixed(2)} SANDBOX purchase? Type AUTHORIZE: `,
  );
  if (consent !== 'AUTHORIZE') {
    console.log('Stopped without purchase authorization or order creation.');
    process.exitCode = 2;
    return;
  }
  await call(`/requests/${record.id}/approve`, {
    revision: 1,
    amountCents: record.amountCents,
    confirm: true,
  });
  const order = await call(`/payments/${record.id}/order`, { confirm: true });
  console.log('Approve with a Sandbox PERSONAL buyer account in a browser:', order.approvalUrl);
  const capture = await rl.question(
    'After genuine buyer approval, explicitly capture SANDBOX funds? Type CAPTURE: ',
  );
  if (capture !== 'CAPTURE') {
    console.log('Order remains unpaid; capture not requested.');
    process.exitCode = 2;
    return;
  }
  const payment = await call(`/payments/${record.id}/capture`, { confirm: true });
  const inspection = await call(`/payments/${record.id}`);
  if (payment.state !== 'PAID' || inspection.paypalStatus !== 'COMPLETED' || !payment.captureId)
    throw new Error('Capture not authoritatively reconciled');
  const evidence = {
    executedAt: new Date().toISOString(),
    category: 'executed-real-paypal-sandbox',
    recordId: record.id,
    revision: 1,
    amountCents: record.amountCents,
    currency: 'USD',
    orderId: payment.orderId,
    captureId: payment.captureId,
    paypalStatus: inspection.paypalStatus,
    realMoneyUsed: 0,
  };
  mkdirSync('docs/evidence', { recursive: true });
  writeFileSync('docs/evidence/paypal-real-sandbox.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}
try {
  await integrate();
} finally {
  rl.close();
}
