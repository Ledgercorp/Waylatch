import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync } from 'node:fs';
test('field request survives real offline reload', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New field request' }).click();
  await page.getByLabel('Incident reference').fill('FLOOD-TEST');
  await page.getByLabel('Resource description').fill('Water for fictional shelter');
  await page.getByLabel('Quantity').fill('24');
  await page.getByLabel('Requested amount (USD)').fill('65.00');
  await page.getByLabel('Origin label').fill('Synthetic field team');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Preserve request' }).click();
  await expect(
    page.getByText('Water for fictional shelter', { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('OFFLINE · requests stay on this device')).toBeVisible();
  await expect(
    page.getByText('Water for fictional shelter', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText('$65.00').first()).toBeVisible();
});
test('packets cross two disconnected browser contexts and reject corruption', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'QR handoff' }).click();
  const packetText = await page.getByLabel('All handoff packets').inputValue();
  const packetImage = await page.getByRole('img', { name: /Handoff packet/ }).screenshot();
  const second = await browser.newContext();
  const receiver = await second.newPage();
  await receiver.goto('/');
  await second.setOffline(true);
  await receiver.getByRole('button', { name: 'Receive handoff' }).click();
  await receiver
    .getByLabel('Scan QR image')
    .setInputFiles({ name: 'packet.png', mimeType: 'image/png', buffer: packetImage });
  await expect(receiver.getByText(/packets accepted/)).toBeVisible();
  await receiver.getByRole('textbox', { name: 'Packet text', exact: true }).fill('RL1:broken');
  await receiver.getByRole('button', { name: 'Import packets' }).click();
  await expect(receiver.getByRole('alert')).toContainText(/Invalid|integrity|packet/i);
  await receiver.getByRole('textbox', { name: 'Packet text', exact: true }).fill(packetText);
  await receiver.getByRole('button', { name: 'Import packets' }).click();
  await expect(receiver.getByText('Handoff complete · human review required')).toBeVisible();
  await receiver.getByRole('button', { name: 'Preserve imported request' }).click();
  await expect(receiver.getByText('QR import · untrusted').first()).toBeVisible();
  await second.close();
});
test('coordinator explicitly reviews and approves, missing credentials stay honest', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Coordinator sign in' }).click();
  await page.getByLabel('Coordinator passphrase').fill('browser-test-passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Send to coordinator review' }).click();
  await page.getByLabel('Review note').fill('Synthetic incident and quantities checked');
  await page.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await page.getByRole('button', { name: 'Authorize purchase' }).click();
  await page.getByRole('button', { name: 'Confirm authorization' }).click();
  await expect(page.getByText('Purchase authorized', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Sandbox order' })).toBeDisabled();
  await expect(page.getByText(/Sandbox credentials are not configured/)).toBeVisible();
});
for (const size of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
])
  test(`accessible command interface ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'From field need to verified action.' }),
    ).toBeVisible();
    await expect(page.locator('body')).not.toHaveJSProperty('scrollWidth', 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const results = await new AxeBuilder({ page }).analyze();
    writeFileSync(
      `docs/evidence/axe-${size.width}.json`,
      JSON.stringify(results.violations, null, 2),
    );
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ).toEqual([]);
    await page.screenshot({ path: `docs/evidence/interface-${size.width}.png`, fullPage: true });
  });
test('real local AI and separate claim approval are usable through the interface', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Coordinator sign in' }).click();
  await page.getByLabel('Coordinator passphrase').fill('browser-test-passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Load synthetic demo records' }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: /RL-DEMO02 URGENT/ }).click();
  await page.getByRole('button', { name: 'Send to coordinator review' }).click();
  await page.getByRole('button', { name: /RL-CLAIM01 CLAIM/ }).click();
  await page.getByRole('button', { name: 'Send to coordinator review' }).click();
  const beforeAssessment = await (await page.request.get('/api/state')).json();
  await page.getByRole('button', { name: 'Run local semantic review' }).click();
  await expect(page.getByText('Real local AI inference')).toBeVisible();
  await expect(page.getByText('Semantically similar expense description').first()).toBeVisible();
  await expect(page.getByText(/AI cannot authorize, reject or execute a payment/)).toBeVisible();
  const afterAssessment = await (await page.request.get('/api/state')).json();
  expect(afterAssessment.records).toEqual(beforeAssessment.records);
  expect(afterAssessment.payments).toEqual(beforeAssessment.payments);
  let results = await new AxeBuilder({ page }).analyze();
  writeFileSync('docs/evidence/axe-review.json', JSON.stringify(results.violations, null, 2));
  expect(results.violations.map((x) => x.id)).toEqual([]);
  await page.screenshot({ path: 'docs/evidence/review-ai.png', fullPage: true });
  await page
    .getByLabel('Review note')
    .fill('Synthetic incurred expense and receipt digest checked; duplicate context reviewed');
  await page.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await page.getByRole('button', { name: 'Authorize reimbursement review' }).click();
  await page.getByRole('button', { name: 'Confirm review approval' }).click();
  await expect(page.getByText('reimbursement-approved', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Payouts unavailable · entitlement unverified')).toBeVisible();
  results = await new AxeBuilder({ page }).analyze();
  writeFileSync('docs/evidence/axe-claim.json', JSON.stringify(results.violations, null, 2));
  expect(results.violations.map((x) => x.id)).toEqual([]);
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  await expect(page.getByText(/Chain verified ·/)).toBeVisible();
  await expect(page.getByText('reimbursement approved', { exact: true })).toBeVisible();
  results = await new AxeBuilder({ page }).analyze();
  writeFileSync('docs/evidence/axe-audit.json', JSON.stringify(results.violations, null, 2));
  expect(results.violations.map((x) => x.id)).toEqual([]);
  await page.screenshot({ path: 'docs/evidence/audit.png', fullPage: true });
});
test('mobile capture and QR dialogs have accessible controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'New field request' }).click();
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((x) => x.id)).toEqual([]);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'QR handoff' }).click();
  await expect(page.getByRole('img', { name: /Handoff packet/ })).toBeVisible();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((x) => x.id)).toEqual([]);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Receive handoff' }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((x) => x.id)).toEqual([]);
});

test('Waylatch metadata and legacy IndexedDB survive offline reload', async ({ page, context }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Waylatch · From field need to verified action');
  await expect(page.getByRole('link', { name: 'Waylatch home' })).toBeVisible();
  const fixture = JSON.parse(readFileSync('tests/fixtures/rescueledger-v1.json', 'utf8'));
  await page.evaluate(async (entry) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('rescueledger-field-v1', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('requests'))
          db.createObjectStore('requests', { keyPath: 'request.id' });
        if (!db.objectStoreNames.contains('receiver')) db.createObjectStore('receiver');
      };
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction('requests', 'readwrite');
        tx.objectStore('requests').put(entry);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      r.onerror = () => reject(r.error);
    });
  }, fixture.outbox);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect(page.getByText('Preserved in IndexedDB', { exact: true })).toBeVisible();
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('Waylatch');
  expect(manifest.short_name).toBe('Waylatch');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Waylatch home' })).toBeVisible();
  await expect(page.getByText('Preserved in IndexedDB', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(async () => (await caches.match('/manifest.webmanifest'))?.json()),
  ).toMatchObject({ name: 'Waylatch' });
});

test('constrained network preserves local work and reconnection does not submit or pay', async ({
  page,
  context,
}) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 64 * 1024,
    uploadThroughput: 16 * 1024,
  });
  const started = performance.now();
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  const coldLoadMilliseconds = performance.now() - started;
  await page.getByRole('button', { name: 'Coordinator sign in' }).click();
  await page.getByLabel('Coordinator passphrase').fill('browser-test-passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  const beforeResponse = await page.request.get('/api/state');
  expect(beforeResponse.status()).toBe(200);
  const before = await beforeResponse.json();
  await page.getByRole('button', { name: 'New field request' }).click();
  await page
    .getByLabel('Resource description')
    .fill('Fictional constrained-network continuity test');
  await page.getByLabel('Quantity', { exact: true }).fill('1');
  await page.getByLabel('Requested amount (USD)').fill('3.25');
  await page.getByLabel('Origin label').fill('Synthetic network test team');
  // End CDP throttling before Playwright takes ownership of offline state.
  // Two independent emulation controllers otherwise restore conflicting state on reload.
  await cdp.send('Network.disable');
  await cdp.detach();
  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await page.getByRole('button', { name: 'Preserve request' }).click();
  await expect(
    page.getByText('Fictional constrained-network continuity test', { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('OFFLINE · requests stay on this device')).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('ONLINE · local preservation ready')).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Fictional constrained-network continuity test', { exact: true }).first(),
  ).toBeVisible();
  const afterResponse = await page.request.get('/api/state');
  expect(afterResponse.status()).toBe(200);
  const after = await afterResponse.json();
  expect(after.records).toEqual(before.records);
  expect(after.payments).toEqual(before.payments);
  expect(after.events).toEqual(before.events);
  writeFileSync(
    'docs/evidence/constrained-network.json',
    JSON.stringify(
      {
        category: 'executed-browser-with-simulated-network',
        latencyMilliseconds: 150,
        downloadBytesPerSecond: 65536,
        uploadBytesPerSecond: 16384,
        coldLoadMilliseconds,
        offlineReloadPreserved: true,
        reconnectSubmittedRecords: 0,
        reconnectFinancialOperations: 0,
        limitation:
          'Chromium CDP emulation on this host, not emergency field or real mobile network measurements.',
      },
      null,
      2,
    ) + '\n',
  );
});
