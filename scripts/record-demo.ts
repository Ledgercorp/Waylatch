import { chromium, expect, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve('.cache/demo');
await mkdir(root, { recursive: true });
const origin = 'http://127.0.0.1:4183';
// This is an explicitly automated, fictional UI fixture. It cannot call PayPal.
const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
  env: {
    ...process.env,
    PORT: '4183',
    APP_ORIGIN: origin,
    DATABASE_PATH: `${root}/demo-${Date.now()}.sqlite`,
    COORDINATOR_PASSWORD: 'demo-fixture-no-payments',
    PAYPAL_CLIENT_ID: '',
    PAYPAL_CLIENT_SECRET: '',
    PAYPAL_SECRET_KEY: '',
    PAYPAL_WEBHOOK_ID: '',
  },
  stdio: 'ignore',
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const scenes: { segment: number; seconds: number; caption: string }[] = [];
let segment = 0;
let start = 0;
async function scene(page: Page, caption: string, hold = 6000) {
  scenes.push({ segment, seconds: (performance.now() - start) / 1000, caption });
  console.log(caption);
  await page.waitForTimeout(hold);
}
async function click(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + '/api/health')).ok) break;
    } catch {
      /* startup */
    }
    await wait(200);
    if (i === 99) throw new Error('Demo server did not start');
  }
  const opts = {
    viewport: { width: 1600, height: 740 },
    recordVideo: { dir: root, size: { width: 1600, height: 740 } },
  };
  const field = await browser.newContext(opts);
  const page = await field.newPage();
  start = performance.now();
  await page.goto(origin);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await scene(page, 'Waylatch / From field need to verified action.', 6500);
  await click(page, 'New field request');
  await page
    .getByLabel('Resource description')
    .fill('Water bottles for displaced families at Ember shelter');
  await page.getByLabel('Quantity', { exact: true }).fill('24');
  await page.getByLabel('Requested amount (USD)').fill('128.00');
  await page.getByLabel('Origin label').fill('Fictional storm-response field team');
  await field.setOffline(true);
  await scene(page, 'Network failure simulated. The field request stays on this device.', 6500);
  await click(page, 'Preserve request');
  // Click dispatch is not IndexedDB completion. Match the application's completion signal.
  await expect(
    page
      .getByText('Water bottles for displaced families at Ember shelter', { exact: true })
      .first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('OFFLINE · requests stay on this device')).toBeVisible();
  await expect(
    page
      .getByText('Water bottles for displaced families at Ember shelter', { exact: true })
      .first(),
  ).toBeVisible();
  await scene(page, 'Complete offline reload: the actual IndexedDB request survives.', 8000);
  await click(page, 'QR handoff');
  const packets = await page.getByLabel('All handoff packets').inputValue();
  const qr = await page.getByRole('img', { name: /Handoff packet/ }).screenshot();
  await scene(page, 'RL1 packets carry request data. They carry no payment authority.', 8500);
  const fieldVideo = page.video()!;
  await field.close();
  await fieldVideo.saveAs(`${root}/field.webm`);

  segment = 1;
  const coordinator = await browser.newContext(opts);
  const receiver = await coordinator.newPage();
  start = performance.now();
  await receiver.goto(origin);
  await receiver.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await coordinator.setOffline(true);
  await click(receiver, 'Receive handoff');
  await receiver
    .getByLabel('Scan QR image')
    .setInputFiles({ name: 'actual-field-packet.png', mimeType: 'image/png', buffer: qr });
  await expect(receiver.getByText(/packets accepted/)).toBeVisible();
  await scene(receiver, 'Second disconnected browser: an actual QR image is decoded.', 6000);
  await receiver.getByRole('textbox', { name: 'Packet text', exact: true }).fill(packets);
  await click(receiver, 'Import packets');
  await expect(receiver.getByText('Handoff complete · human review required')).toBeVisible();
  await scene(receiver, 'Fragments reconstructed. Import provenance remains untrusted.', 7000);
  await click(receiver, 'Preserve imported request');
  await coordinator.setOffline(false);
  await click(receiver, 'Coordinator sign in');
  await receiver.getByLabel('Coordinator passphrase').fill('demo-fixture-no-payments');
  await click(receiver, 'Sign in');
  await click(receiver, 'Review');
  await click(receiver, 'Send to coordinator review');
  await click(receiver, 'Load synthetic demo records');
  await receiver.getByRole('button', { name: /RL-DEMO02 URGENT/ }).click();
  await click(receiver, 'Send to coordinator review');
  await receiver.getByRole('button', { name: /RL-CLAIM01 CLAIM/ }).click();
  await click(receiver, 'Send to coordinator review');
  await click(receiver, 'Run local semantic review');
  await expect(receiver.getByText('Real local AI inference')).toBeVisible({ timeout: 30000 });
  await expect(
    receiver.getByText('Semantically similar expense description').first(),
  ).toBeVisible();
  await receiver.getByText('Real local AI inference').scrollIntoViewIfNeeded();
  await scene(
    receiver,
    'Real local MiniLM inference: explainable similarity, not a fraud probability.',
    11500,
  );
  await receiver
    .getByLabel('Review note')
    .fill(
      'AUTOMATED LOCAL DEMO FIXTURE: not an independent human decision. Fictional receipt and duplicate indicators inspected by scripted test only.',
    );
  await scene(
    receiver,
    'Review controls shown with an automated test fixture. AI has no financial authority.',
    6500,
  );
  await click(receiver, 'Mark reviewed');
  await click(receiver, 'Pay');
  await click(receiver, 'Authorize reimbursement review');
  await scene(
    receiver,
    'Separate incurred-expense claim: explicit confirmation. No reimbursement transfer.',
    6000,
  );
  await click(receiver, 'Confirm review approval');
  await expect(receiver.getByText('Payouts unavailable · entitlement unverified')).toBeVisible();
  await scene(receiver, 'Claim review works. Payout entitlement remains unverified.', 5000);
  await receiver.getByRole('button', { name: /RL-DEMO02 URGENT/ }).click();
  await click(receiver, 'Review');
  await receiver
    .getByLabel('Review note')
    .fill(
      'AUTOMATED LOCAL DEMO FIXTURE ONLY: no independent human authorization and no provider transaction.',
    );
  await click(receiver, 'Mark reviewed');
  await click(receiver, 'Pay');
  await click(receiver, 'Authorize purchase');
  await scene(
    receiver,
    'Sandbox authorization boundary exercised by a labeled automated fixture.',
    5000,
  );
  await click(receiver, 'Confirm authorization');
  await expect(receiver.getByRole('button', { name: 'Create Sandbox order' })).toBeDisabled();
  await expect(receiver.getByText(/Sandbox credentials are not configured/)).toBeVisible();
  await scene(
    receiver,
    'Honest payment status: credentials missing. No PayPal order or capture executed.',
    10000,
  );
  await click(receiver, 'Audit');
  await expect(receiver.getByText(/Chain verified ·/)).toBeVisible();
  await receiver.getByText(/Chain verified ·/).scrollIntoViewIfNeeded();
  await scene(
    receiver,
    'Actual SQLite events validate as a SHA-256-linked, tamper-evident chain.',
    8000,
  );
  const state = await receiver.evaluate(async () => (await fetch('/api/state')).json());
  await writeFile('docs/evidence/demo-audit.json', JSON.stringify(state.events, null, 2) + '\n');
  const download = receiver.waitForEvent('download');
  await click(receiver, 'Export chain');
  await (await download).saveAs(`${root}/exported-audit.json`);
  if (
    JSON.stringify(JSON.parse(await readFile(`${root}/exported-audit.json`, 'utf8'))) !==
    JSON.stringify(state.events)
  )
    throw new Error('Audit export differs');
  await scene(
    receiver,
    'Offline continuity and local AI verified. Genuine Sandbox capture is the remaining gate.',
    8000,
  );
  const coordinatorVideo = receiver.video()!;
  await coordinator.close();
  await coordinatorVideo.saveAs(`${root}/coordinator.webm`);
  await writeFile(`${root}/scenes.json`, JSON.stringify(scenes, null, 2));
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
