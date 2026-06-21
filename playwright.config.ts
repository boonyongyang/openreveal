import { defineConfig, devices } from "@playwright/test";

import { loadPlaywrightEnv } from "./playwright.env";

loadPlaywrightEnv();
process.env.API_RATE_LIMIT_MAX = process.env.PLAYWRIGHT_API_RATE_LIMIT_MAX ?? "1000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.PLAYWRIGHT_AUTH_RATE_LIMIT_MAX ?? "1000";

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
    },
    {
      // Trick-mechanics specs on the REAL WebKit engine at iPhone 13 dims —
      // the same engine iOS Safari runs, so bfcache/back-trap, the 16px
      // no-zoom rule, and the Maps redirect are verified on Safari, not a
      // chromium stand-in. Scoped to the three specs to keep CI fast.
      name: "mobile-safari",
      testMatch: ["**/decoy-fidelity.pw.ts", "**/maps-redirect.pw.ts", "**/back-trap.pw.ts"],
      use: { ...devices["iPhone 13"] }
    }
  ],
  webServer: {
    command: `APP_BASE_URL=${baseURL} API_BASE_URL=${apiBaseURL} pnpm dev`,
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 120_000
  }
});
