import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
// Mirrors `base` in astro.config.mjs (trailing slash so relative gotos resolve
// under the sub-path). Tests use relative URLs (e.g. goto('browse')).
const baseURL = `http://localhost:${PORT}/coding-font-tournament/`;

/** See https://playwright.dev/docs/test-configuration. */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Locally, "list" prints per-test lines and writes no files. On CI the array form
  // runs two reporters: "list" keeps that readable log, and "html" writes
  // playwright-report/ for the workflow's upload-artifact step. `open: "never"` stops
  // Playwright from launching a browser to show the report (its default on failure),
  // which would stall the job.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "desktop-chromium",
      testIgnore: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "desktop-firefox",
      testIgnore: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "desktop-webkit",
      testIgnore: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
    // Tests treat any "mobile-*" project as mobile; everything else is desktop.
    // iPhone 15 runs WebKit — covers the mobile <select> change-event behavior.
    {
      name: "mobile-iphone-15",
      testIgnore: /.*\.desktop\.spec\.ts/,
      use: { ...devices["iPhone 15"] },
    },
    // Galaxy Z Flip and Pixel 10 aren't in Playwright's device registry, so we use
    // the closest available presets: Galaxy S24 and Pixel 7.
    {
      name: "mobile-pixel-10",
      testIgnore: /.*\.desktop\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-galaxy-z-flip",
      testIgnore: /.*\.desktop\.spec\.ts/,
      use: { ...devices["Galaxy S24"] },
    },
  ],

  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Disable Astro's dev toolbar so its bottom-pinned overlay can't intercept
    // clicks on bottom-anchored UI (e.g. the unified-view Choose buttons).
    env: { ASTRO_DEV_TOOLBAR: "off" },
  },
});
