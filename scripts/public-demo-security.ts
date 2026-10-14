import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { demoRequest } from '../src/requests/schema';

const origin = new URL(process.env.WAYLATCH_DEMO_URL || 'https://waylatch-judge.onrender.com')
  .origin;
const checks: Record<string, unknown>[] = [];
async function call(
  path: string,
  method = 'GET',
  cookie = '',
  body?: unknown,
  extra: Record<string, string> = {},
) {
  return fetch(origin + path, {
    method,
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...extra,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
const cookies: string[] = [];
try {
  // Two real same-client sessions. Forged forwarded addresses must not permit a third.
  for (const address of ['192.0.2.201', '198.51.100.202']) {
    const response = await call(
      '/api/demo/session',
      'POST',
      '',
      {},
      { 'X-Forwarded-For': address },
    );
    assert.equal(response.status, 200);
    const setCookie = response.headers.get('set-cookie')!;
    assert.match(setCookie, /^__Host-waylatch_demo=[a-f0-9]{64};/);
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=3600'])
      assert(setCookie.includes(attribute));
    cookies.push(setCookie.split(';')[0]);
  }
  const spoof = await call(
    '/api/demo/session',
    'POST',
    '',
    {},
    { 'X-Forwarded-For': '203.0.113.203' },
  );
  if (spoof.status === 200) cookies.push(spoof.headers.get('set-cookie')!.split(';')[0]);
  assert.equal(spoof.status, 429);
  checks.push({
    scene: 'Render edge forwarded-IP spoofing',
    independentSessions: 2,
    forgedThirdSessionStatus: spoof.status,
  });
  for (const forwarded of ['192.0.2.9, 198.51.100.8', '::1', 'unknown', '']) {
    const result = await call(
      '/api/demo/session',
      'POST',
      '',
      {},
      {
        'X-Forwarded-For': forwarded,
        'X-Real-IP': `192.0.2.${10 + checks.length}`,
        Forwarded: 'for=203.0.113.99;host=foreign.example;proto=http',
        'X-Forwarded-Host': 'foreign.example',
        'X-Forwarded-Proto': 'http',
      },
    );
    if (result.status === 200) cookies.push(result.headers.get('set-cookie')!.split(';')[0]);
    assert.equal(result.status, 429);
  }
  const forgedClientHeader = await call(
    '/api/demo/session',
    'POST',
    '',
    {},
    {
      'CF-Connecting-IP': '203.0.113.77',
    },
  );
  assert.equal(forgedClientHeader.status, 403);
  assert.equal((await call('/api/state')).status, 401);
  assert.equal(
    (await call('/api/state', 'GET', '__Host-waylatch_demo=' + 'a'.repeat(64))).status,
    401,
  );
  const missingOrigin = await call('/api/requests', 'POST', cookies[0], {}, { Origin: '' });
  const crossSite = await call('/api/state', 'GET', cookies[0], undefined, {
    'Sec-Fetch-Site': 'cross-site',
  });
  assert.equal(missingOrigin.status, 403);
  assert.equal(crossSite.status, 403);
  checks.push({
    scene: 'Hosted cookie, authentication and forwarded-header boundaries',
    secureHostOnlyCookie: true,
    forwardedHeaderVariantsRejected: 4,
    forgedCloudflareClientHeader: forgedClientHeader.status,
    missingOrigin: missingOrigin.status,
    crossSite: crossSite.status,
    unauthenticatedState: 401,
    forgedCookie: 401,
  });
  const financialPaths = [
    '/api/session',
    '/api/requests/RL-JUDGE-WATER-A/approve',
    '/api/claims/RL-JUDGE-WATER-A/approve',
    '/api/payments/RL-JUDGE-WATER-A/order',
    '/api/payments/RL-JUDGE-WATER-A/capture',
    '/api/payments/RL-JUDGE-WATER-A',
    '/api/webhooks/paypal',
    '/api/Payments/RL-JUDGE-WATER-A/order',
    '/api/payments%2FRL-JUDGE-WATER-A%2Fcapture',
    '/api/requests/RL-JUDGE-WATER-A/approve/',
  ];
  for (const cookie of ['', cookies[0]])
    for (const path of financialPaths)
      assert.equal((await call(path, 'POST', cookie, { confirm: true })).status, 403);
  assert.equal((await call('/api/payments/RL-JUDGE-WATER-A', 'GET', cookies[0])).status, 403);
  checks.push({
    scene: 'Hosted financial/provider deny boundary before authentication',
    deniedRequests: financialPaths.length * 2 + 1,
    financialOperationsExecuted: 0,
  });
  const foreign = await call(
    '/api/requests',
    'POST',
    cookies[0],
    {},
    { Origin: 'https://foreign.example' },
  );
  assert.equal(foreign.status, 403);
  const oversized = await call('/api/requests', 'POST', cookies[0], { data: 'x'.repeat(50000) });
  assert.equal(oversized.status, 413);
  const invalid = await call('/api/requests', 'POST', cookies[0], {
    record: {},
    provenance: 'local',
  });
  assert.equal(invalid.status, 400);
  assert(!JSON.stringify(await invalid.json()).includes('stack'));
  for (const path of [
    '/.env',
    '/Dockerfile',
    '/server/public-judge.ts',
    '/models/Xenova/all-MiniLM-L6-v2/config.json',
  ])
    assert.equal((await call(path)).status, 404);
  checks.push({
    scene: 'Hosted origin, body and validation boundaries',
    foreignOrigin: foreign.status,
    oversizedBody: oversized.status,
    invalidRecord: invalid.status,
    privateServerOrModelFilesExposed: 0,
  });
  for (let index = 0; index < 9; index++) {
    const result = await call('/api/requests', 'POST', cookies[0], {
      record: {
        ...demoRequest,
        id: `RL-CAPACITY-${index}`,
        origin: 'Fictional hosted capacity check',
        resources: Array.from({ length: 2 }, (_, resource) => ({
          description: (
            `Fictional bounded CPU admission check ${index}, item ${resource}: ` +
            'Water, blankets and medical supplies for a fictional shelter. '.repeat(10)
          ).slice(0, 490),
          quantity: 1,
        })),
      },
      provenance: 'local',
    });
    assert.equal(result.status, 201);
  }
  const cap = await call('/api/requests', 'POST', cookies[0], {
    record: { ...demoRequest, id: 'RL-CAPACITY-LAST' },
    provenance: 'local',
  });
  assert.equal(cap.status, 429);
  const state = (await (await call('/api/state', 'GET', cookies[0])).json()) as any;
  assert.equal(state.records.length, 16);
  assert.equal(state.payments.length, 0);
  checks.push({
    scene: 'Hosted bounded fictional storage',
    records: state.records.length,
    extraRecordStatus: cap.status,
  });
  const attempts = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      call(
        index % 2 === 0 ? '/api/risk/RL-CAPACITY-0' : '/api/risk/RL-JUDGE-WATER-A',
        'POST',
        cookies[index % 2],
        {},
      ),
    ),
  );
  assert(attempts.every((r) => r.status === 200 || r.status === 503));
  assert(attempts.some((r) => r.status === 200));
  assert(attempts.some((r) => r.status === 503));
  const evidence = (await attempts.find((r) => r.status === 200)!.json()) as any;
  assert.equal(evidence.mode, 'semantic-local');
  checks.push({
    scene: 'Hosted concurrent CPU admission',
    statuses: attempts.map((r) => r.status),
    mode: evidence.mode,
  });
  writeFileSync(
    'docs/evidence/public-demo-live-security.json',
    JSON.stringify(
      {
        url: origin,
        deployedGitCommit: process.env.WAYLATCH_DEPLOYED_COMMIT ?? null,
        executedAt: new Date().toISOString(),
        passed: true,
        checks,
        spendingUsd: 0,
        providerOperations: 0,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ passed: true, checks }));
} catch (error) {
  writeFileSync(
    'docs/evidence/public-demo-live-security-failure.json',
    JSON.stringify(
      {
        url: origin,
        deployedGitCommit: process.env.WAYLATCH_DEPLOYED_COMMIT ?? null,
        executedAt: new Date().toISOString(),
        passed: false,
        checks,
        error: String(error),
        spendingUsd: 0,
        providerOperations: 0,
      },
      null,
      2,
    ) + '\n',
  );
  throw error;
} finally {
  for (const cookie of cookies)
    assert.equal((await call('/api/demo/session', 'DELETE', cookie)).status, 200);
}
