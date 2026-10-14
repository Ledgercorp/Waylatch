import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const evidenceOnly = process.env.WAYLATCH_EVIDENCE_ONLY === '1';
export default defineConfig({
  testDir: 'tests/competitive',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: `PORT=4174 npm run judge${evidenceOnly ? ' -- --evidence-only' : ''}`,
    url: 'http://127.0.0.1:4174/api/health',
    reuseExistingServer: false,
    timeout: 120000,
  },
  reporter: [['list']],
});
