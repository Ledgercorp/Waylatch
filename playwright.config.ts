import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: `PAYPAL_CLIENT_ID= PAYPAL_CLIENT_SECRET= PAYPAL_WEBHOOK_ID= COORDINATOR_PASSWORD=browser-test-passphrase DATABASE_PATH=data/browser-${Date.now()}.sqlite npm start`,
    url: 'http://127.0.0.1:4173/api/health',
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
