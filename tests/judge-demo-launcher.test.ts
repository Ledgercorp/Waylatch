import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
const launcher = () => import(new URL('../scripts/judge-start.mjs', import.meta.url).href);
describe('one-command judge bootstrap', () => {
  it('rejects unsupported Node versions before setup', async () => {
    const { requireNode24 } = await launcher();
    expect(() => requireNode24('22.16.0')).toThrow(/Node 24/);
    expect(() => requireNode24('24.0.0')).not.toThrow();
  });
  it('passes a clean child environment without credentials or normal database configuration', async () => {
    const { judgeEnvironment } = await launcher();
    const environment = {
      PATH: '/test/bin',
      PAYPAL_CLIENT_ID: 'fictional-client',
      PAYPAL_CLIENT_SECRET: 'fictional-secret',
      PAYPAL_SECRET_KEY: 'fictional-alias',
      PAYPAL_WEBHOOK_ID: 'fictional-hook',
      COORDINATOR_PASSWORD: 'fictional-password',
      DATABASE_PATH: 'normal.sqlite',
      APP_ORIGIN: 'https://normal.example',
    };
    expect(judgeEnvironment(environment)).toEqual({ PATH: '/test/bin' });
    expect(environment.DATABASE_PATH).toBe('normal.sqlite');
  });
  it('reuses a built application until its actual source content changes', async () => {
    const { sourceFingerprint, productionBuildNeeded, stampProductionBuild } = await launcher();
    const directory = mkdtempSync(join(tmpdir(), 'waylatch-bootstrap-test-'));
    directories.push(directory);
    mkdirSync(join(directory, 'src'));
    mkdirSync(join(directory, 'dist'));
    writeFileSync(join(directory, 'src/App.tsx'), 'original');
    const original = sourceFingerprint(directory);
    expect(productionBuildNeeded(directory)).toBe(true);
    writeFileSync(join(directory, 'dist/index.html'), '<html>production build</html>');
    stampProductionBuild(directory);
    expect(productionBuildNeeded(directory)).toBe(false);
    writeFileSync(join(directory, 'src/App.tsx'), 'changed');
    expect(sourceFingerprint(directory)).not.toBe(original);
    expect(productionBuildNeeded(directory)).toBe(true);
  });
});
