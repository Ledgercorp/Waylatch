import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/public-demo',
  outputDir: 'test-results/public-demo',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 360000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.WAYLATCH_DEMO_URL ?? 'http://localhost:10000',
    viewport: { width: 1440, height: 1000 },
    proxy: process.env.WAYLATCH_TEST_PROXY
      ? { server: process.env.WAYLATCH_TEST_PROXY }
      : undefined,
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  reporter: [['list']],
});
