import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function check(dotenvOnly: boolean) {
  const root = mkdtempSync(join(tmpdir(), 'waylatch-alias-scan-'));
  roots.push(root);
  mkdirSync(join(root, 'dist'));
  const fixture = 'synthetic-alias-secret-for-release-test';
  writeFileSync(join(root, 'dist/index.js'), `export const accidentalLeak = '${fixture}';`);
  writeFileSync(join(root, '.env'), dotenvOnly ? `PAYPAL_SECRET_KEY=${fixture}\n` : '');
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href,
      resolve('scripts/check-release.ts'),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        PAYPAL_CLIENT_ID: '',
        PAYPAL_CLIENT_SECRET: 'synthetic-preferred-but-unused',
        PAYPAL_SECRET_KEY: dotenvOnly ? undefined : fixture,
        DOTENV_CONFIG_PATH: join(root, '.env'),
      },
      encoding: 'utf8',
    },
  );
  expect(result.status).toBe(1);
  expect(result.stdout).not.toContain(fixture);
  const report = JSON.parse(result.stdout.trim());
  expect(report.findings).toContain(
    'server credential/provider code in frontend artifact: dist/index.js',
  );
}
it('detects an ignored fallback-alias secret leaked into a frontend artifact', () => check(false));
it('detects dotenv-only alias leakage without exposing its value', () => check(true));
