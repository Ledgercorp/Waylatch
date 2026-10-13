import { afterAll, expect, test } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = mkdtempSync(join(tmpdir(), 'waylatch-audit-export-'));
const real = JSON.parse(readFileSync('docs/evidence/paypal-sandbox-audit.json', 'utf8'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));
function inspect(value: unknown) {
  const path = join(directory, 'audit.json');
  writeFileSync(path, JSON.stringify(value));
  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/validate-audit.ts', path], {
    encoding: 'utf8',
  });
}
test('judge command validates the saved genuine seven-event export envelope', () => {
  const result = inspect(real);
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({ valid: true, brokenAt: null, count: 7 });
});
test('browser raw event-array exports remain supported', () => {
  const result = inspect(real.events);
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout).count).toBe(7);
});
test('envelope metadata cannot make a tampered event chain valid', () => {
  const altered = structuredClone(real);
  altered.chain = { valid: true, brokenAt: null, count: 7 };
  altered.events[0].data.record.amountCents = 200;
  const result = inspect(altered);
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stdout).valid).toBe(false);
});
test('an envelope without events fails closed', () => {
  const result = inspect({ chain: { valid: true, count: 7 } });
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stdout)).toEqual({ valid: false, code: 'AUDIT_EXPORT_INVALID' });
});
