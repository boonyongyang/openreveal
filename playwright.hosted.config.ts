import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.HOSTED_BASE_URL;
const apiBaseURL = process.env.HOSTED_API_BASE_URL?.trim() || baseURL;
const passphrase = process.env.PERFORMER_PASSPHRASE;

if (!baseURL || !apiBaseURL) {
  throw new Error("Set HOSTED_BASE_URL (and optionally HOSTED_API_BASE_URL) before running hosted tests.");
}

if (!passphrase) {
  throw new Error("Set PERFORMER_PASSPHRASE before running hosted tests.");
}

process.env.PLAYWRIGHT_API_BASE_URL = apiBaseURL;

export default defineConfig({
  testDir: "./apps/web/e2e",
  testMatch: "**/*.pw.ts",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: "list",
  outputDir: process.env.HOSTED_EVIDENCE_DIR ?? "test-results/hosted",
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
      name: "mobile-safari",
      testMatch: ["**/decoy-fidelity.pw.ts", "**/maps-redirect.pw.ts", "**/back-trap.pw.ts"],
      use: { ...devices["iPhone 13"] }
    }
  ]
});
