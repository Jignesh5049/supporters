import { defineConfig, devices } from '@playwright/test';

/** The API's stdout, where its dev SMS sender prints OTPs. */
export const API_LOG = 'test-results/api.log';

// Local only for now: needs PostgreSQL and Valkey from apps/api/docker-compose.yml
// and a prepared apps/api/.env (see apps/web/README.md, End-to-end tests).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `node e2e/start-api.mjs ${API_LOG}`,
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'next dev',
      url: 'http://localhost:3000/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
