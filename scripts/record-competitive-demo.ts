import { chromium, expect, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
const root = resolve('.cache/competitive-demo');
await mkdir(root, { recursive: true });
const origin = 'http://127.0.0.1:4185';
const evidenceOnly = process.argv.includes('--evidence-only');
const server = spawn(
  process.execPath,
  ['scripts/judge-start.mjs', ...(evidenceOnly ? ['--evidence-only'] : [])],
  { env: { ...process.env, PORT: '4185' }, stdio: ['ignore', 'pipe', 'pipe'] },
);
let serverOutput = '';
server.stdout.on('data', (chunk) => (serverOutput += chunk.toString()));
server.stderr.on('data', (chunk) => (serverOutput += chunk.toString()));
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
});
const scenes: { segment: number; seconds: number; kind: string; caption: string }[] = [];
let segment = 0,
  started = 0;
async function scene(page: Page, kind: string, caption: string, hold = 5000) {
  scenes.push({ segment, seconds: (performance.now() - started) / 1000, kind, caption });
  console.log(caption);
  await page.waitForTimeout(hold);
}
const click = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();
const options = {
  viewport: { width: 1600, height: 740 },
  recordVideo: { dir: root, size: { width: 1600, height: 740 } },
};
try {
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      if ((await fetch(origin + '/api/health')).ok) break;
    } catch {
      /* Startup. */
    }
    if (server.exitCode !== null) throw new Error('Isolated judge startup failed.');
    if (attempt === 149) throw new Error('Isolated judge startup timed out.');
    await new Promise((done) => setTimeout(done, 200));
  }
  const field = await browser.newContext(options);
  const page = await field.newPage();
  started = performance.now();
  await page.goto(origin);
  await scene(
    page,
    'introduction',
    'Waylatch: keep a request moving; keep authority human. Fictional walkthrough, real application.',
    4500,
  );
  await click(page, 'New fictional request');
  await page
    .getByLabel('Resource description')
    .fill('Bottled potable water for families at Ember shelter');
  await page.getByLabel('Quantity', { exact: true }).fill('24');
  await page.getByLabel('Requested amount (USD)').fill('128.00');
  await page.getByLabel('Origin label').fill('Fictional field team · competitive walkthrough');
  await field.setOffline(true);
  await scene(
    page,
    'offline-form',
    'Network loss simulated. Preserve the request locally; no server submission or financial action.',
    4500,
  );
  await click(page, 'Preserve request');
  await expect(page.getByText('Preserved in IndexedDB', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('OFFLINE · requests stay on this device')).toBeVisible();
  await page.locator('.record-panel').scrollIntoViewIfNeeded();
  await scene(
    page,
    'offline-reload',
    'Actual offline browser reload: the request survives in IndexedDB. Browser observations are local evidence.',
    6000,
  );
  await click(page, 'QR handoff');
  const packets = await page.getByLabel('All handoff packets').inputValue();
  const qr = await page.getByRole('img', { name: /Handoff packet/ }).screenshot();
  await scene(
    page,
    'qr-sender',
    'Bounded QR packets carry request data across disconnection. They carry no payment authority.',
    5500,
  );
  const fieldVideo = page.video()!;
  await field.close();
  await fieldVideo.saveAs(`${root}/field.webm`);
  segment = 1;
  const context = await browser.newContext(options);
  const receiver = await context.newPage();
  started = performance.now();
  await receiver.goto(origin);
  await receiver.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await context.setOffline(true);
  await click(receiver, 'Receive handoff');
  await receiver
    .getByLabel('Scan QR image')
    .setInputFiles({ name: 'authentic-packet.png', mimeType: 'image/png', buffer: qr });
  await expect(receiver.getByText(/packets accepted/)).toBeVisible();
  await receiver.getByLabel('Packet text', { exact: true }).fill(packets);
  await click(receiver, 'Import packets');
  await expect(receiver.getByText('Handoff complete · human review required')).toBeVisible();
  await scene(
    receiver,
    'qr-receiver',
    'A second offline browser decodes an actual QR image and reconstructs the packets. Import stays untrusted.',
    6000,
  );
  await click(receiver, 'Preserve imported request');
  await context.setOffline(false);
  await click(receiver, 'Start judge demo');
  await click(receiver, 'Review');
  await click(receiver, 'Send to coordinator review');
  await receiver.getByLabel('Compare with a saved record').selectOption('RL-JUDGE-WATER-B');
  await click(receiver, 'Run local semantic review');
  await expect(
    receiver.getByText(evidenceOnly ? 'Deterministic indicators only' : 'Real local AI inference', {
      exact: true,
    }),
  ).toBeVisible();
  await receiver.locator('.pair-comparison').scrollIntoViewIfNeeded();
  await scene(
    receiver,
    'comparison',
    evidenceOnly
      ? 'New side-by-side comparison: terms, amounts, incident and receipt evidence. This recording uses deterministic fallback; model access is blocked.'
      : 'Real local MiniLM inference plus side-by-side context. Semantic cosine is evidence, never a fraud probability.',
    9000,
  );
  await receiver
    .getByRole('region', { name: 'Scrollable recorded comparison evidence' })
    .scrollIntoViewIfNeeded();
  await scene(
    receiver,
    'context',
    'Related, unrelated or investigate: an advisory disposition never approves either record or executes payment.',
    6500,
  );
  await click(receiver, 'Pay');
  await receiver.locator('.record-panel').scrollIntoViewIfNeeded();
  await scene(
    receiver,
    'human-boundary',
    'Human REVIEW, AUTHORIZE, buyer approval and separate CAPTURE remain required. Judge financial controls are disabled.',
    6500,
  );
  await receiver.locator('#judge-guide > summary').click();
  await click(receiver, 'View completed Sandbox Proof Trail');
  await receiver.locator('#judge-guide > summary').click();
  await receiver.locator('.proof-archive-banner').scrollIntoViewIfNeeded();
  await expect(receiver.getByText('2W330508JA572391V', { exact: true }).first()).toBeVisible();
  await scene(
    receiver,
    'historical-payment',
    'Separate historical purchase: USD 1.00 simulated funds, completed capture, USD 0.00 real spending. No checkout is reenacted.',
    7500,
  );
  await receiver.locator('.proof-validation').scrollIntoViewIfNeeded();
  await scene(
    receiver,
    'audit-scope',
    'Proof Trail names browser, organization and provider sources. Original seven-event audit links validate; missing earlier events stay visible.',
    7000,
  );
  await receiver
    .getByRole('heading', { name: 'Archived provider inspection confirms completion' })
    .scrollIntoViewIfNeeded();
  await scene(
    receiver,
    'provider-proof',
    'Saved independent PayPal inspection confirms COMPLETED. Viewing this archive makes no provider call and no new purchase.',
    7000,
  );
  await receiver.getByText('Original chain for independent validation', { exact: true }).click();
  const downloadEvent = receiver.waitForEvent('download');
  await click(receiver, 'Export original organization chain');
  const download = await downloadEvent;
  await download.saveAs(`${root}/historical-chain.json`);
  await receiver.locator('.proof-exports').scrollIntoViewIfNeeded();
  await scene(
    receiver,
    'exports',
    'Download a sanitized report or independently validate the original SHA-256 chain. An administrator can rewrite a full database.',
    6500,
  );
  const state = await (await receiver.request.get(origin + '/api/state')).json();
  if (
    state.payments.length ||
    state.events.some((e: { type: string }) =>
      /purchase_approved|paypal_order_created|capture_completed/.test(e.type),
    )
  )
    throw new Error('Judge financial state unexpectedly changed.');
  const coordinatorVideo = receiver.video()!;
  await context.close();
  await coordinatorVideo.saveAs(`${root}/coordinator.webm`);
  const hashes = Object.fromEntries(
    await Promise.all(
      ['field.webm', 'coordinator.webm', 'historical-chain.json'].map(async (file) => [
        file,
        createHash('sha256')
          .update(await readFile(`${root}/${file}`))
          .digest('hex'),
      ]),
    ),
  );
  await writeFile(`${root}/scenes.json`, JSON.stringify(scenes, null, 2));
  await writeFile(
    'docs/evidence/competitive-demo-recording.json',
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        category: 'actual-application-footage',
        evidenceOnly,
        sourceVideos: hashes,
        scenes,
        financialProviderCalls: 0,
        paymentRecords: state.payments.length,
        historicalPurchaseReenacted: false,
        realSpending: 0,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
  server.kill('SIGTERM');
  await writeFile(`${root}/server.log`, serverOutput);
}
