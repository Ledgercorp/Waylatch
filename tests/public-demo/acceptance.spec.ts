import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { validateChain } from '../../src/audit/chain';

const baseURL = process.env.WAYLATCH_DEMO_URL ?? 'http://localhost:10000';
const origin = new URL(baseURL).origin;
const scope = ['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname) ? 'local' : 'live';
const prefix = `docs/evidence/public-demo-${scope}`;
const checks: Record<string, unknown>[] = [];
let realAIObserved = false;
mkdirSync('docs/evidence', { recursive: true });

test.afterEach(async ({ page, context }, info) => {
  if (info.status !== 'passed') {
    await context.setOffline(false);
    await page.request
      .delete(`${baseURL}/api/demo/session`, { headers: { Origin: origin } })
      .catch(() => undefined);
  }
  writeFileSync(
    `${prefix}.json`,
    JSON.stringify(
      {
        category:
          scope === 'live'
            ? 'observed-public-https-browser-acceptance'
            : 'local-public-mode-browser-acceptance',
        url: baseURL,
        deployedGitCommit: process.env.WAYLATCH_DEPLOYED_COMMIT ?? null,
        executedAt: new Date().toISOString(),
        passed: info.status === 'passed',
        status: info.status,
        errors: info.errors.map((error) => error.message),
        realAIObserved,
        checks,
        limitations: [
          'Offline conditions use Chromium browser network emulation.',
          'Automated accessibility checks do not replace assistive-technology or human usability evaluation.',
          'This run does not establish provider sleep/resume behavior or prolonged uptime.',
        ],
      },
      null,
      2,
    ) + '\n',
  );
});

async function accessible(page: Page, scene: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target),
  }));
  checks.push({ scene, accessibilityViolations: violations });
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
}

async function start(page: Page) {
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'Start Interactive Demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reset demo', exact: true })).toBeVisible();
}

async function downloadJSON(page: Page, label: string) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  return readFileSync((await (await download).path())!, 'utf8');
}

test('public guided workflow, genuine AI, proof, independent visitors and safe reset', async ({
  page,
  context,
  browser,
}) => {
  const openedAt = performance.now();
  await page.goto(baseURL);
  await expect(
    page.getByRole('button', { name: 'Start Interactive Demo', exact: true }),
  ).toBeVisible();
  const startupMilliseconds = performance.now() - openedAt;
  await accessible(page, 'public introduction desktop');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to command workspace' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.screenshot({ path: `${prefix}-intro.png`, fullPage: true });
  await page.getByRole('button', { name: 'Start Interactive Demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reset demo', exact: true })).toBeVisible();
  const initial = await (await page.request.get(`${baseURL}/api/state`)).json();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));

  const marker = `Fictional water delivery for Ember shelter ${Date.now()}`;
  await page.getByRole('button', { name: 'New fictional request', exact: true }).click();
  await page.getByLabel('Resource description').fill(marker);
  await page.getByLabel('Quantity', { exact: true }).fill('24');
  await page.getByLabel('Requested amount (USD)').fill('4.50');
  await page.getByLabel('Origin label').fill('Fictional public acceptance crew');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Preserve request', exact: true }).click();
  await expect(page.getByText('Preserved in IndexedDB', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('OFFLINE · requests stay on this device', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(marker, { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Open QR handoff', exact: true }).click();
  await expect(page.getByRole('img', { name: /Handoff packet/ })).toBeVisible();
  const packets = (await page.getByLabel('All handoff packets').inputValue()).split('\n');
  const image = await page.getByRole('img', { name: /Handoff packet/ }).screenshot();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Receive packets', exact: true }).click();
  await page
    .getByLabel('Scan QR image')
    .setInputFiles({ name: 'fictional-packet.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByText('1 packets accepted', { exact: false })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Receive packets', exact: true }).click();
  await expect(page.getByText('1 packets accepted', { exact: false })).toBeVisible();
  await page.getByLabel('Packet text', { exact: true }).fill(packets.join('\n'));
  await page.getByRole('button', { name: 'Import packets', exact: true }).click();
  await expect(
    page.getByText('Handoff complete · human review required', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('1 duplicate packets safely ignored', { exact: true })).toBeVisible();
  await accessible(page, 'offline QR reconstruction');
  await page.screenshot({ path: `${prefix}-qr.png`, fullPage: true });
  await page.getByRole('button', { name: 'Preserve imported request', exact: true }).click();
  await context.setOffline(false);
  await page.reload();
  const reconnected = await (await page.request.get(`${baseURL}/api/state`)).json();
  expect(reconnected).toEqual(initial);
  checks.push({
    scene: 'offline request/reload/real QR decode/reconstruction/reconnect',
    startupMilliseconds,
    packetCount: packets.length,
    restoredPartialPackets: 1,
    serverMutationsOnReconnect: 0,
  });

  await page.getByRole('button', { name: 'Open coordinator review', exact: true }).click();
  await page.getByRole('button', { name: 'Send to coordinator review', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Run local semantic review', exact: true }),
  ).toBeVisible();
  const stored = await (await page.request.get(`${baseURL}/api/state`)).json();
  const ownRecord = stored.records.find(
    (entry: any) => entry.record.resources[0].description === marker,
  ).record;

  const independent = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    proxy: process.env.WAYLATCH_TEST_PROXY
      ? { server: process.env.WAYLATCH_TEST_PROXY }
      : undefined,
  });
  const other = await independent.newPage();
  try {
    await start(other);
    const otherInitial = await (await other.request.get(`${baseURL}/api/state`)).json();
    expect(JSON.stringify(otherInitial)).not.toContain(marker);
    expect(JSON.stringify(otherInitial)).not.toContain(ownRecord.id);
    for (const [path, data] of [
      [
        `/api/requests/${ownRecord.id}/review`,
        { revision: 1, note: 'Fictional unauthorized cross-visitor probe', disposition: 'clear' },
      ],
      [
        `/api/requests/${ownRecord.id}/relationships`,
        {
          candidateId: 'RL-JUDGE-WATER-A',
          revision: 1,
          candidateRevision: 1,
          disposition: 'investigate',
          note: 'Fictional cross-visitor probe',
        },
      ],
    ] as const) {
      expect(
        (await other.request.post(baseURL + path, { headers: { Origin: origin }, data })).status(),
      ).toBe(409);
    }
    expect(await (await page.request.get(`${baseURL}/api/state`)).json()).toEqual(stored);

    const healthBefore = await (await page.request.get(`${baseURL}/api/health`)).json();
    const riskReply = page.waitForResponse((response) =>
      response.url().endsWith(`/api/risk/${ownRecord.id}`),
    );
    const inferenceStarted = performance.now();
    await page.getByRole('button', { name: 'Run local semantic review', exact: true }).click();
    const response = await riskReply;
    expect(response.status()).toBe(200);
    const assessment = await response.json();
    expect(assessment.mode).toBe('semantic-local');
    expect(
      assessment.candidates.some((candidate: any) => typeof candidate.similarity === 'number'),
    ).toBe(true);
    await expect(page.getByText('Real local AI inference', { exact: true })).toBeVisible();
    const healthAfter = await (await page.request.get(`${baseURL}/api/health`)).json();
    expect(healthAfter.successfulInferenceBatches).toBeGreaterThan(
      healthBefore.successfulInferenceBatches,
    );
    realAIObserved = true;
    checks.push({
      scene: 'genuine server CPU inference',
      inferenceMilliseconds: performance.now() - inferenceStarted,
      mode: assessment.mode,
      healthBefore,
      healthAfter,
      candidates: assessment.candidates.map((candidate: any) => ({
        id: candidate.id,
        similarity: candidate.similarity,
        tier: candidate.tier,
      })),
    });
    await page.getByLabel('Compare with a saved record').selectOption('RL-JUDGE-WATER-A');
    await page.getByLabel('Relationship judgment').selectOption('investigate');
    await page
      .getByLabel('Pair disposition note')
      .fill(
        'Fictional human review: inspect locations and quantities; cosine alone establishes no duplicate.',
      );
    await page.getByRole('button', { name: 'Record pair disposition', exact: true }).click();
    await expect(page.getByText('Latest saved pair disposition: investigate')).toBeVisible();
    await accessible(page, 'genuine advisory review desktop');
    await page.screenshot({ path: `${prefix}-review.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await accessible(page, 'genuine advisory review mobile');
    await page.getByRole('region', { name: 'Scrollable recorded comparison evidence' }).focus();
    await expect(
      page.getByRole('region', { name: 'Scrollable recorded comparison evidence' }),
    ).toBeFocused();
    await page.screenshot({ path: `${prefix}-mobile.png`, fullPage: true });
    const reviewed = await (await page.request.get(`${baseURL}/api/state`)).json();
    expect(reviewed.payments).toEqual([]);
    expect(
      reviewed.events.some(
        (event: any) =>
          event.type === 'pair_disposition_recorded' && event.recordId === ownRecord.id,
      ),
    ).toBe(true);
    expect(validateChain(reviewed.events).valid).toBe(true);

    for (const path of [
      `/api/requests/${ownRecord.id}/approve`,
      `/api/payments/${ownRecord.id}/order`,
      `/api/payments/${ownRecord.id}/capture`,
    ])
      expect(
        (
          await page.request.post(baseURL + path, {
            headers: { Origin: origin },
            data: { confirm: true },
          })
        ).status(),
      ).toBe(403);
    await page.getByRole('button', { name: 'Pay', exact: true }).click();
    await expect(
      page.getByText('Judge mode · financial operations disabled', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Authorize purchase', exact: true }),
    ).toBeDisabled();
    await page
      .getByRole('button', { name: 'Open selected request’s Proof Trail', exact: true })
      .click();
    await expect(
      page.getByText('Local AI risk assessment recorded', { exact: true }),
    ).toBeVisible();
    await page.getByText('Original chain for independent validation', { exact: true }).click();
    expect(
      validateChain(
        JSON.parse(await downloadJSON(page, 'Export original organization chain')).events,
      ).valid,
    ).toBe(true);
    await other
      .getByRole('button', { name: 'Open selected request’s Proof Trail', exact: true })
      .click();
    await other.getByText('Original chain for independent validation', { exact: true }).click();
    expect(await downloadJSON(other, 'Export original organization chain')).not.toContain(
      ownRecord.id,
    );

    await page
      .getByRole('button', { name: 'View completed Sandbox Proof Trail', exact: true })
      .click();
    await expect(page.getByText('Historical Sandbox evidence', { exact: true })).toBeVisible();
    await expect(page.getByText('8WY07860808872629', { exact: true }).first()).toBeVisible();
    await accessible(page, 'historical archived proof mobile');
    await page.screenshot({ path: `${prefix}-proof.png`, fullPage: true });
    await page.getByText('Original chain for independent validation', { exact: true }).click();
    expect(
      validateChain(
        JSON.parse(await downloadJSON(page, 'Export original organization chain')).events,
      ),
    ).toEqual({ valid: true, count: 7, brokenAt: null });
    const sanitized = await downloadJSON(page, 'Export sanitized report');
    expect(sanitized).toContain('8WY07860808872629');
    expect(sanitized).not.toContain('Human operator explicitly replied');
    expect(JSON.stringify(reviewed.events)).not.toContain('capture_completed');
    checks.push({
      scene: 'human disposition/fictional proof/historical evidence/exports',
      fictionalChainValid: true,
      originalHistoricalEvents: 7,
      historicalCapture: '8WY07860808872629',
      sanitizedReportRedacted: true,
      financialMutationRoutesBlocked: 3,
      fictionalPayments: 0,
    });

    await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Start Interactive Demo', exact: true }),
    ).toBeVisible();
    expect((await page.request.get(`${baseURL}/api/state`)).status()).toBe(401);
    expect(await (await other.request.get(`${baseURL}/api/state`)).json()).toEqual(otherInitial);
    const localCounts = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('rescueledger-field-v1', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = db.transaction(['requests', 'receiver'], 'readonly');
      const count = (name: string) =>
        new Promise<number>((resolve) => {
          const request = transaction.objectStore(name).count();
          request.onsuccess = () => resolve(request.result);
        });
      const counts = await Promise.all([count('requests'), count('receiver')]);
      db.close();
      return counts;
    });
    expect(localCounts).toEqual([0, 0]);
    await other.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await expect(
      other.getByRole('button', { name: 'Start Interactive Demo', exact: true }),
    ).toBeVisible();
    checks.push({
      scene: 'two concurrent independent visitors and reset',
      isolatedRead: true,
      crossVisitorWritesBlocked: 2,
      isolatedExport: true,
      resetOtherVisitorUnchanged: true,
      resetLocalOutbox: 0,
      resetReceiver: 0,
      priorSessionRejected: true,
    });
  } finally {
    // Release only our fictional sessions, including after an assertion fails.
    await context.setOffline(false);
    await page.request.delete(`${baseURL}/api/demo/session`, { headers: { Origin: origin } });
    await other.request.delete(`${baseURL}/api/demo/session`, { headers: { Origin: origin } });
    await independent.close();
  }
});
