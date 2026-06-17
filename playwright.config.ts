import { defineConfig, devices } from "@playwright/test";

import { loadPlaywrightEnv } from "./playwright.env";

loadPlaywrightEnv();
process.env.API_RATE_LIMIT_MAX = process.env.PLAYWRIGHT_API_RATE_LIMIT_MAX ?? "1000";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const apiBaseURL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:4000";

export default defineConfig({
  testDir: "./apps/web/e2e",
  testMatch: "**/*.pw.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: `APP_BASE_URL=${baseURL} API_BASE_URL=${apiBaseURL} pnpm dev`,
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 120_000
  }
});
