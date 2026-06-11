import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const baseURL = `http://localhost:${PORT}`;

/** See https://playwright.dev/docs/test-configuration. */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry'
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // iPhone 13 runs WebKit — covers the mobile <select> change-event behavior.
    { name: 'mobile', use: { ...devices['iPhone 13'] } }
  ],

  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
