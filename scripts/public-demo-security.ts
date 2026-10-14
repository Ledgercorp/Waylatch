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
    cookies.push(response.headers.get('set-cookie')!.split(';')[0]);
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
  checks.push({
    scene: 'Hosted origin, body and validation boundaries',
    foreignOrigin: foreign.status,
    oversizedBody: oversized.status,
    invalidRecord: invalid.status,
  });
  for (let index = 0; index < 9; index++) {
    const result = await call('/api/requests', 'POST', cookies[0], {
      record: {
        ...demoRequest,
        id: `RL-CAPACITY-${index}`,
        origin: 'Fictional hosted capacity check',
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
    cookies.map((cookie) => call('/api/risk/RL-JUDGE-WATER-A', 'POST', cookie, {})),
  );
  assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 503]);
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
