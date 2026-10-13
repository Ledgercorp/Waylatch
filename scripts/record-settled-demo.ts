import 'dotenv/config';
import { chromium, expect, type BrowserContext } from '@playwright/test';
import { createServer as createViteServer } from 'vite';
import { randomBytes, createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Store } from '../server/store';
import { PayPalClient } from '../server/paypal';
import { paypalConfigFromEnv } from '../server/paypal-config';
import { createApp } from '../server/app';

// Record an already completed real payment. No review, authorization, order or capture clicks.
const settled = JSON.parse(readFileSync('docs/evidence/paypal-real-sandbox.json', 'utf8'));
const independent = JSON.parse(
  readFileSync('docs/evidence/paypal-independent-verification.json', 'utf8'),
);
if (
  !independent.independentlyVerified ||
  independent.orderId !== settled.orderId ||
  independent.captureId !== settled.captureId ||
  settled.paymentState !== 'PAID'
)
  throw new Error('Independent settled-payment evidence required');
const root = '.cache/settled-demo';
mkdirSync(root, { recursive: true });
const database = `${root}/settled-${Date.now()}.sqlite`;
copyFileSync(settled.isolatedDatabase, database);
const store = new Store(database);
const before = JSON.stringify({
  records: store.records(),
  payments: store.payments(),
  events: store.events(),
});
const password = randomBytes(48).toString('base64url');
const origin = 'http://127.0.0.1:5183';
const app = createApp({ store, paypal: new PayPalClient(paypalConfigFromEnv()), password, origin });
const backend = app.listen(4173, '127.0.0.1');
await new Promise<void>((resolve, reject) => {
  backend.once('listening', resolve);
  backend.once('error', reject);
});
const vite = await createViteServer({
  server: { host: '127.0.0.1', port: 5183, strictPort: true },
});
await vite.listen();
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let recordingContext: BrowserContext | undefined;
let blockedFinancialMutations = 0;
const apiRequests: { method: string; path: string }[] = [];
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 740 },
    recordVideo: { dir: root, size: { width: 1600, height: 740 } },
  });
  recordingContext = context;
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    apiRequests.push({ method: request.method(), path });
    if (!['GET', 'HEAD'].includes(request.method()) && path !== '/api/session') {
      blockedFinancialMutations++;
      await route.abort();
    } else await route.continue();
  });
  const login = await context.request.post(origin + '/api/session', { data: { password } });
  if (!login.ok()) throw new Error('Temporary recording session unavailable');
  const page = await context.newPage();
  const started = performance.now();
  await page.goto(origin + '/?paypal=return&record=' + encodeURIComponent(settled.recordId));
  await expect(page.getByText('PAID', { exact: true }).last()).toBeVisible();
  await expect(page.getByText(settled.orderId, { exact: true })).toBeVisible();
  await expect(page.getByText(settled.captureId, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm Sandbox capture' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Create Sandbox order' })).toBeDisabled();
  await page.getByText('PAID', { exact: true }).last().scrollIntoViewIfNeeded();
  const payStart = (performance.now() - started) / 1000;
  await page.screenshot({ path: 'docs/evidence/payment-completed.png' });
  await page.waitForTimeout(12000);
  const inspectedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().endsWith(`/api/payments/${settled.recordId}`),
  );
  await page.getByRole('button', { name: 'Inspect authoritative Sandbox status' }).click();
  const inspected = await (await inspectedResponse).json();
  if (inspected.paypalStatus !== 'COMPLETED' || inspected.payment.captureId !== settled.captureId)
    throw new Error('Actual browser provider inspection mismatch');
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  await expect(page.getByText('Chain verified · 7 events', { exact: true })).toBeVisible();
  await page.getByText('Chain verified · 7 events', { exact: true }).scrollIntoViewIfNeeded();
  const auditStart = (performance.now() - started) / 1000;
  await page.screenshot({ path: 'docs/evidence/audit-paypal-completed.png' });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export chain' }).click();
  const exported = `${root}/exported-audit.json`;
  await (await download).saveAs(exported);
  const exportMatches =
    JSON.stringify(JSON.parse(readFileSync(exported, 'utf8'))) === JSON.stringify(store.events());
  if (!exportMatches) throw new Error('Actual browser audit export mismatch');
  await page.waitForTimeout(9000);
  const video = page.video()!;
  await context.request.delete(origin + '/api/session');
  await context.close();
  await video.saveAs(`${root}/settled.webm`);
  const after = JSON.stringify({
    records: store.records(),
    payments: store.payments(),
    events: store.events(),
  });
  if (after !== before || blockedFinancialMutations !== 0)
    throw new Error('Recording changed settled financial state');
  const videoBytes = readFileSync(`${root}/settled.webm`);
  const evidence = {
    recordedAt: new Date().toISOString(),
    category: 'actual-ui-footage-of-genuine-completed-sandbox-payment',
    file: `${root}/settled.webm`,
    sha256: createHash('sha256').update(videoBytes).digest('hex'),
    databaseSource: settled.isolatedDatabase,
    databaseCopy: database,
    payStartSeconds: payStart,
    auditStartSeconds: auditStart,
    recordId: settled.recordId,
    orderId: settled.orderId,
    captureId: settled.captureId,
    amountCents: settled.amountCents,
    applicationState: 'PAID',
    providerState: 'COMPLETED',
    auditEvents: store.events().length,
    browserExportMatchesPersistedAudit: exportMatches,
    captureButtonDisabled: true,
    createOrderButtonDisabled: true,
    financialStateUnchanged: after === before,
    blockedFinancialMutations,
    apiRequests,
    productionBuildExecuted: false,
    devServerUsed: true,
    paymentApprovalReenacted: false,
    realMoneyUsed: 0,
  };
  writeFileSync(
    'docs/evidence/settled-demo-recording.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
  console.log(JSON.stringify(evidence));
} finally {
  await recordingContext?.request.delete(origin + '/api/session').catch(() => {});
  await browser?.close();
  await vite.close();
  await new Promise<void>((resolve) => backend.close(() => resolve()));
  store.close();
}
