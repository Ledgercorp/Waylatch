import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const origin = new URL(process.env.WAYLATCH_DEMO_URL || 'https://waylatch-judge.onrender.com')
  .origin;
const evidencePath = 'docs/evidence/public-demo-live-rate-limit.json';
// Start just after a minute boundary so this bounded test stays inside one server window.
const waitMilliseconds = 60000 - (Date.now() % 60000) + 1000;
console.log(`Waiting ${waitMilliseconds} ms for an unused rate window.`);
await delay(waitMilliseconds);
const startedAt = new Date().toISOString();
const statuses: number[] = [];
try {
  for (let offset = 0; offset < 130; offset += 5) {
    const results = await Promise.all(
      Array.from({ length: 5 }, async (_, index) => {
        const n = offset + index;
        const response = await fetch(origin + '/api/demo', {
          headers: {
            Origin: origin,
            'X-Forwarded-For': `192.0.2.${n + 1}, 198.51.100.${n + 1}`,
            'X-Real-IP': `203.0.113.${n + 1}`,
            Forwarded: `for=192.0.2.${n + 1}`,
          },
        });
        await response.arrayBuffer();
        if (response.status === 429) assert(response.headers.has('retry-after'));
        return response.status;
      }),
    );
    statuses.push(...results);
  }
  const finishedAt = new Date().toISOString();
  assert.equal(
    Math.floor(Date.parse(startedAt) / 60000),
    Math.floor(Date.parse(finishedAt) / 60000),
  );
  assert.equal(statuses.filter((status) => status === 200).length, 120);
  assert.equal(statuses.filter((status) => status === 429).length, 10);
  const result = {
    url: origin,
    deployedGitCommit: process.env.WAYLATCH_DEPLOYED_COMMIT ?? null,
    passed: true,
    startedAt,
    finishedAt,
    requests: statuses.length,
    accepted: 120,
    rateLimited: 10,
    uniqueForgedForwardedHeaderSets: 130,
    retryAfterPresent: true,
    financialOperationsExecuted: 0,
    spendingUsd: 0,
  };
  writeFileSync(evidencePath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} catch (error) {
  writeFileSync(
    evidencePath,
    JSON.stringify(
      { url: origin, passed: false, startedAt, statuses, error: String(error) },
      null,
      2,
    ) + '\n',
  );
  throw error;
}
