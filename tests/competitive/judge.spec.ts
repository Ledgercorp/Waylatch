import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { validateChain } from '../../src/audit/chain';
import { buildPackets, toText } from '../../src/offline/codec';
const evidence: Record<string, unknown>[] = [];
const evidenceOnly = process.env.WAYLATCH_EVIDENCE_ONLY === '1';
mkdirSync('docs/evidence', { recursive: true });
test.afterAll(() =>
  writeFileSync(
    'docs/evidence/competitive-browser.json',
    JSON.stringify(
      {
        category: 'actual-chromium-application-checks',
        executedAt: new Date().toISOString(),
        evidenceOnly,
        realAIValidated: !evidenceOnly,
        financialProviderCalls: 0,
        realSpending: 0,
        checks: evidence,
        limitations: [
          'Browser offline/network conditions are simulated locally.',
          'Axe automated checks do not replace a full assistive-technology or human usability audit.',
          ...(evidenceOnly
            ? [
                'Real model inference and model-dependent browser regression are blocked by missing pinned assets.',
              ]
            : []),
        ],
      },
      null,
      2,
    ) + '\n',
  ),
);
async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start judge demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
}
async function axe(page: Page, scene: string) {
  const result = await new AxeBuilder({ page }).analyze();
  evidence.push({
    scene,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
    passes: result.passes.length,
  });
  expect(result.violations.map((v) => v.id)).toEqual([]);
}
test('guided offline preservation, interrupted QR recovery and reconnect never pay', async ({
  page,
  context,
}) => {
  const started = performance.now();
  await start(page);
  const before = await (await page.request.get('/api/state')).json();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.getByRole('button', { name: 'New field request' }).click();
  await page
    .getByLabel('Resource description')
    .fill('Fictional independently fulfilled water delivery, gate B');
  await page.getByLabel('Quantity', { exact: true }).fill('18');
  await page.getByLabel('Requested amount (USD)').fill('4.50');
  await page.getByLabel('Origin label').fill('Fictional competitive test crew');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Preserve request', exact: true }).click();
  await expect(page.getByText('Preserved in IndexedDB', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('OFFLINE · requests stay on this device')).toBeVisible();
  await expect(
    page
      .getByText('Fictional independently fulfilled water delivery, gate B', { exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Proof Trail', exact: true }).click();
  await expect(page.getByText(/browser reported offline/)).toBeVisible();
  await page.getByRole('button', { name: 'Request', exact: true }).click();
  await page.getByRole('button', { name: 'QR handoff', exact: true }).click();
  const packets = (await page.getByLabel('All handoff packets').inputValue()).split('\n');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Receive handoff', exact: true }).click();
  await page.getByLabel('Packet text', { exact: true }).fill(packets[0]);
  await page.getByRole('button', { name: 'Import packets', exact: true }).click();
  await expect(page.getByText('1 packets accepted', { exact: false })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Receive handoff', exact: true }).click();
  await expect(page.getByText('1 packets accepted', { exact: false })).toBeVisible();
  await page.getByLabel('Packet text', { exact: true }).fill(packets.join('\n'));
  await page.getByRole('button', { name: 'Import packets', exact: true }).click();
  await expect(page.getByText('Handoff complete · human review required')).toBeVisible();
  await expect(page.getByText('1 duplicate packets safely ignored')).toBeVisible();
  await axe(page, 'offline QR receiver');
  await page.screenshot({ path: 'docs/evidence/competitive-qr-recovery.png', fullPage: true });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await context.setOffline(false);
  await page.reload();
  const after = await (await page.request.get('/api/state')).json();
  expect(after.records).toEqual(before.records);
  expect(after.payments).toEqual(before.payments);
  expect(after.events).toEqual(before.events);
  evidence.push({
    scene: 'offline/reload/QR/reconnect',
    elapsedMilliseconds: performance.now() - started,
    packetCount: packets.length,
    duplicateCount: 1,
    restoredPartialPackets: 1,
    reconnectServerMutations: 0,
  });
});
test('difficult calibration pair can be compared and disposition audited without financial authority', async ({
  page,
}) => {
  await start(page);
  const dataset = JSON.parse(readFileSync('evaluation/cases-unlabeled.json', 'utf8'));
  const fixture = dataset.cases.find(
    (c: any) => c.split === 'calibration' && c.category === 'consolidated-document',
  );
  const demo = (await (await page.request.get('/api/demo')).json()).archive.record;
  for (const [index, source] of [fixture.left, fixture.right].entries()) {
    const record = {
      ...demo,
      id: `RL-BROWSER-HARD-${index}`,
      incident: source.incident,
      resources: [{ description: source.description, quantity: 1 }],
      amountCents: source.amountCents,
      amountKind: source.amountCents === null ? 'unknown' : 'exact',
      receiptDigest: source.receiptDigest,
      transactionReference: source.transactionReference,
      createdAt: source.createdAt,
      origin: 'Fictional calibration interface test',
    };
    const response = await page.request.post('/api/requests', {
      data: { record, provenance: 'local' },
    });
    expect(response.status()).toBe(201);
  }
  await page.reload();
  await page.getByRole('button', { name: /RL-BROWSER-HARD-0/ }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByLabel('Compare with a saved record').selectOption('RL-BROWSER-HARD-1');
  await expect(page.getByRole('heading', { name: 'Record comparison' })).toBeVisible();
  await page.getByRole('button', { name: 'Run local semantic review' }).click();
  await expect(
    page.getByText(evidenceOnly ? 'Deterministic indicators only' : 'Real local AI inference', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText('Potentially related', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Contradicting recorded evidence' }),
  ).toBeVisible();
  await page.getByLabel('Relationship judgment').selectOption('investigate');
  await page
    .getByLabel('Pair disposition note')
    .fill(
      'Automated advisory test only: consolidated document has non-overlapping purchases; inspect lines.',
    );
  await page.getByRole('button', { name: 'Record pair disposition' }).click();
  await expect(page.getByText('Latest saved pair disposition: investigate')).toBeVisible();
  await axe(page, 'calibration hard-negative review');
  await page.screenshot({
    path: 'docs/evidence/competitive-comparison-desktop.png',
    fullPage: true,
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = await cdp.send('Performance.getMetrics');
  evidence.push({
    scene: 'normal review page resource sample',
    metrics: Object.fromEntries(
      metrics.metrics
        .filter((m) => ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'Documents'].includes(m.name))
        .map((m) => [m.name, m.value]),
    ),
    scope: 'One Chromium CDP sample; no isolated peak-memory or mobile-hardware claim.',
  });
  await cdp.detach();
  await page.setViewportSize({ width: 390, height: 844 });
  await axe(page, 'calibration comparison 390px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.getByRole('region', { name: 'Scrollable recorded comparison evidence' }).focus();
  await expect(
    page.getByRole('region', { name: 'Scrollable recorded comparison evidence' }),
  ).toBeFocused();
  await page.screenshot({
    path: 'docs/evidence/competitive-comparison-mobile.png',
    fullPage: true,
  });
  await page.getByLabel('Relationship judgment').selectOption('unrelated');
  await page
    .getByLabel('Pair disposition note')
    .fill('Automated workload test: separate purchases; dismissal is advisory only.');
  await page.getByRole('button', { name: 'Record pair disposition' }).click();
  await expect(page.getByText('Latest saved pair disposition: unrelated')).toBeVisible();
  await page.getByText(/Candidate summaries ·/).click();
  await expect(page.getByText(/Dismissed for current revisions · 1/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Compare RL-BROWSER-HARD-1', exact: true }),
  ).toBeHidden();
  const state = await (await page.request.get('/api/state')).json();
  expect(state.payments).toEqual([]);
  expect(state.events.some((e: any) => e.type === 'pair_disposition_recorded')).toBe(true);
  expect(state.records.find((r: any) => r.record.id === 'RL-BROWSER-HARD-0').status).toBe(
    'pending',
  );
  for (const url of [
    '/api/requests/RL-BROWSER-HARD-0/approve',
    '/api/payments/RL-BROWSER-HARD-0/order',
    '/api/payments/RL-BROWSER-HARD-0/capture',
  ])
    expect((await page.request.post(url, { data: { confirm: true } })).status()).toBe(403);
  await page.getByRole('button', { name: 'Proof Trail', exact: true }).click();
  await expect(
    page.getByText(
      evidenceOnly ? 'Deterministic risk assessment recorded' : 'Local AI risk assessment recorded',
      { exact: true },
    ),
  ).toBeVisible();
  await axe(page, 'fictional Proof Trail');
  evidence.push({
    scene: 'calibration hard-negative comparison',
    caseId: fixture.id,
    mode: evidenceOnly ? 'deterministic-only' : 'semantic-local',
    financialRoutesBlocked: 3,
    paymentRecords: 0,
  });
});
for (const width of [1440, 390])
  test(`historical archive, exports and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'View completed Sandbox Proof Trail' }).click();
    await expect(page.getByText('Historical Sandbox evidence', { exact: true })).toBeVisible();
    await expect(page.getByText('2W330508JA572391V', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('8WY07860808872629', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('USD 0.00', { exact: true })).toBeVisible();
    await axe(page, `historical Proof Trail ${width}px`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: `docs/evidence/competitive-proof-${width}.png`, fullPage: true });
    await page.getByText('Original chain for independent validation', { exact: true }).click();
    const originalDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export original organization chain' }).click();
    const original = await originalDownload;
    const path = await original.path();
    expect(validateChain(JSON.parse(readFileSync(path!, 'utf8')).events)).toEqual({
      valid: true,
      count: 7,
      brokenAt: null,
    });
    const sanitizedDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export sanitized report' }).click();
    const sanitized = await sanitizedDownload;
    const content = readFileSync((await sanitized.path())!, 'utf8');
    expect(content).not.toContain('Human operator explicitly replied');
    expect(content).toContain('8WY07860808872629');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName === 'BODY')).toBe(false);
    evidence.push({
      scene: `historical export ${width}px`,
      originalChainValid: true,
      originalEvents: 7,
      sanitizedReportRedacted: true,
      horizontalPageOverflow: false,
      keyboardFocusedControl: true,
    });
    if (width === 1440) {
      await page.getByRole('button', { name: 'New field request' }).click();
      await page
        .getByLabel('Resource description')
        .fill('Fictional request created after archive inspection');
      await page.getByLabel('Origin label').fill('Fictional archive recovery test');
      await page.getByRole('button', { name: 'Preserve request', exact: true }).click();
      await expect(page.locator('.record-heading .tag')).toHaveText('Locally preserved');
      evidence.push({ scene: 'archive to local request recovery', historicalBadgeCleared: true });
    }
  });

test('conflicting QR snapshots and revised candidates cannot inherit coordinator review evidence', async ({
  page,
}) => {
  await start(page);
  const before = await (await page.request.get('/api/state')).json();
  const authoritative = before.records.find(
    (row: any) => row.record.id === 'RL-JUDGE-WATER-A',
  ).record;
  const conflicting = {
    ...authoritative,
    resources: [
      { description: 'Different untrusted purchase with reused ID and revision', quantity: 24 },
    ],
  };
  await page.getByRole('button', { name: 'Receive handoff', exact: true }).click();
  await page
    .getByLabel('Packet text', { exact: true })
    .fill(buildPackets(conflicting).map(toText).join('\n'));
  await page.getByRole('button', { name: 'Import packets', exact: true }).click();
  await page.getByRole('button', { name: 'Preserve imported request', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(
    page.getByText('Local and coordinator snapshots differ', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run local semantic review' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await expect(page.getByText('Coordinator snapshot mismatch', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Authorize purchase', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Proof Trail', exact: true }).click();
  await expect(
    page.getByText('Coordinator proof withheld for conflicting snapshot', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('list', { name: 'Chronological evidence' })).toHaveCount(0);
  await page.getByRole('button', { name: 'View coordinator snapshot' }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByLabel('Compare with a saved record').selectOption('RL-JUDGE-WATER-B');
  const riskResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/risk/RL-JUDGE-WATER-A'),
  );
  await page.getByRole('button', { name: 'Run local semantic review' }).click();
  const assessment = await (await riskResponse).json();
  expect(assessment.assessedRevisions['RL-JUDGE-WATER-A']).toBe(1);
  expect(assessment.assessedRevisions['RL-JUDGE-WATER-B']).toBe(1);
  const candidate = before.records.find((row: any) => row.record.id === 'RL-JUDGE-WATER-B').record;
  expect(
    (
      await page.request.post('/api/requests', {
        data: {
          record: {
            ...candidate,
            revision: 2,
            resources: [{ description: 'Separate fictional purchase, revised', quantity: 24 }],
          },
          provenance: 'local',
        },
      })
    ).status(),
  ).toBe(201);
  // An unrelated advisory disposition refreshes state without rerunning or replacing the old assessment.
  await page.getByLabel('Compare with a saved record').selectOption('RL-JUDGE-RADIOS');
  await page
    .getByLabel('Pair disposition note')
    .fill('Automated advisory version-boundary test only.');
  await page.getByRole('button', { name: 'Record pair disposition' }).click();
  await expect(page.getByText(/Their stale scores are hidden/)).toBeVisible();
  await page.getByText(/Candidate summaries ·/).click();
  await expect(
    page.getByRole('button', { name: 'Compare RL-JUDGE-WATER-B', exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Compare with a saved record').selectOption('RL-JUDGE-WATER-B');
  await expect(page.getByText('AI similarity not run', { exact: true })).toBeVisible();
  const after = await (await page.request.get('/api/state')).json();
  expect(after.payments).toEqual([]);
  expect(after.records.find((row: any) => row.record.id === authoritative.id).record).toEqual(
    authoritative,
  );
  await axe(page, 'snapshot conflict recovery and stale assessment');
  evidence.push({
    scene: 'snapshot attribution',
    conflictingQRBlocked: true,
    originalServerBodyPreserved: true,
    authoritativeAssessmentRevisions: true,
    staleCandidateSummaryHidden: true,
    paymentRecords: 0,
  });
});
