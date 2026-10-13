import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  clearPayPalEnvironment,
  createJudgeRuntime,
  loadJudgeArchive,
  newJudgePassphrase,
} from '../server/judge-demo';
import { validateChain } from '../src/audit/chain';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function temporary() {
  const directory = mkdtempSync(join(tmpdir(), 'waylatch-judge-test-'));
  directories.push(directory);
  return directory;
}
describe('disposable judge runtime', () => {
  it('removes both secret aliases, client and webhook identifiers without changing unrelated configuration', () => {
    const environment = {
      PAYPAL_CLIENT_ID: 'test-client',
      PAYPAL_CLIENT_SECRET: 'test-secret',
      PAYPAL_SECRET_KEY: 'test-alias',
      PAYPAL_WEBHOOK_ID: 'test-hook',
      PORT: '4173',
    };
    clearPayPalEnvironment(environment);
    expect(environment).toEqual({ PORT: '4173' });
  });
  it('uses independently generated private passphrases and a separate database containing fictional requests only', () => {
    const directory = temporary();
    const runtime = createJudgeRuntime(directory);
    try {
      expect(runtime.store.path).toBe(join(directory, 'judge.sqlite'));
      expect(runtime.password).not.toEqual(newJudgePassphrase());
      expect(runtime.password).toMatch(/^[A-Za-z0-9_-]{64}$/);
      expect(runtime.store.records().length).toBeGreaterThanOrEqual(4);
      expect(
        runtime.store
          .records()
          .every((row) => row.record.origin.includes('fictional') && row.status === 'pending'),
      ).toBe(true);
      expect(runtime.store.payments()).toEqual([]);
      expect(
        runtime.store.records().some((row) => row.record.id === runtime.archive.record.id),
      ).toBe(false);
      expect(
        runtime.store
          .events()
          .every((event) => event.type === 'request_created' || event.type === 'claim_submitted'),
      ).toBe(true);
      expect(validateChain(runtime.store.events()).valid).toBe(true);
    } finally {
      runtime.store.close();
    }
  });
  it('checks the exact saved source SHA and preserves genuine audit hashes', () => {
    const archive = loadJudgeArchive();
    const bytes = readFileSync(archive.providerEvidence.sourceFile);
    expect(archive.providerEvidence.sourceSha256).toBe(
      createHash('sha256').update(bytes).digest('hex'),
    );
    expect(archive.events[6].hash).toBe(
      '114009b9edb04b9a25479b1353a10a2a2fd3a12f4bb37cb1c8354929a0ddcfab',
    );
    expect(archive.currentProviderInspection).toBe(false);
  });
  it('refuses a modified historical chain instead of presenting it as real saved proof', () => {
    const directory = temporary();
    const evidence = join(directory, 'docs/evidence');
    mkdirSync(evidence, { recursive: true });
    for (const file of [
      'paypal-real-sandbox.json',
      'paypal-independent-verification.json',
      'paypal-sandbox-audit.json',
      'paypal-sandbox-audit-validation.json',
    ]) {
      const value = JSON.parse(readFileSync(`docs/evidence/${file}`, 'utf8'));
      if (file === 'paypal-sandbox-audit.json') value.events[1].data.note = 'Modified note';
      writeFileSync(join(evidence, file), JSON.stringify(value));
    }
    expect(() => loadJudgeArchive(directory)).toThrow(/saved source/);
    const original = readFileSync('docs/evidence/paypal-real-sandbox.json');
    writeFileSync(join(evidence, 'paypal-real-sandbox.json'), original);
    expect(() => loadJudgeArchive(directory)).toThrow(/audit integrity/);
  });
});
