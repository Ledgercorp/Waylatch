import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
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
      page.getByRole('heading', { name: 'Field to funds. Every step accounted for.' }),
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
  await page.getByRole('button', { name: 'Run local semantic review' }).click();
  await expect(page.getByText('Real local AI inference')).toBeVisible();
  await expect(page.getByText('Semantically similar expense description').first()).toBeVisible();
  await expect(page.getByText('No payment action taken.').first()).toBeVisible();
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
