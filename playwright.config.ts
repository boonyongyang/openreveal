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
      // Phone-viewport run of the trick-mechanics specs only (keeps CI fast).
      // Chromium engine at iPhone 13 dimensions + touch — CI only installs
      // chromium, and the back-trap caveat keeps a real phone as final gate.
      name: "mobile",
      testMatch: ["**/decoy-fidelity.pw.ts", "**/maps-redirect.pw.ts", "**/back-trap.pw.ts"],
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      }
    }
  ],
  webServer: {
    command: `APP_BASE_URL=${baseURL} API_BASE_URL=${apiBaseURL} pnpm dev`,
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 120_000
  }
});
