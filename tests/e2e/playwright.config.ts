// tests/e2e/playwright.config.ts
import path from 'path';
import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const apiUrl = process.env.API_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: __dirname,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: path.join(process.cwd(), 'playwright-report'), open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -w apps/api',
      url: `${apiUrl}/api/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -w apps/web',
      url: frontendUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'setup', testMatch: /setup\/auth\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /journeys\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
