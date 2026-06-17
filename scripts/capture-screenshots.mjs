#!/usr/bin/env node
// Drives the real performer + audience flow and captures committed PNG stills
// for the README. Unlike record:showcase (which emits gitignored MP4s), the
// output here lives in docs/screenshots/ and is meant to be committed.
import { chromium, expect } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const outputDir = join(root, "docs", "screenshots");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const apiBaseURL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:4000";
const passphrase = process.env.PERFORMER_PASSPHRASE ?? "openreveal-dev";

await mkdir(outputDir, { recursive: true });
await rm(join(root, "data", "screenshots.sqlite"), { force: true });

const server = spawn("pnpm", ["dev"], {
  cwd: root,
  detached: true,
  env: {
    ...process.env,
    API_BASE_URL: apiBaseURL,
    API_RATE_LIMIT_MAX: process.env.PLAYWRIGHT_API_RATE_LIMIT_MAX ?? "1000",
    APP_BASE_URL: baseURL,
    DATABASE_URL: `file:${join(root, "data", "screenshots.sqlite")}`,
    GOOGLE_PLACES_ENABLED: "false",
    PERFORMER_PASSPHRASE: passphrase,
    SESSION_SECRET: "openreveal-screenshots-local-secret-change-me",
    SESSION_TTL_MINUTES: "30",
    WEB_DIST_DIR: ""
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverLog = "";
server.stdout.on("data", (chunk) => (serverLog += chunk.toString()));
server.stderr.on("data", (chunk) => (serverLog += chunk.toString()));

let browser;
let performerContext;
let receiverContext;

try {
  await waitForHealthyServer();

  browser = await chromium.launch();
  performerContext = await browser.newContext({
    viewport: { height: 900, width: 1440 },
    deviceScaleFactor: 2
  });
  receiverContext = await browser.newContext({
    viewport: { height: 844, width: 390 },
    deviceScaleFactor: 2
  });

  const performerPage = await performerContext.newPage();
  const receiverPage = await receiverContext.newPage();

  await captureFlow(performerPage, receiverPage);

  console.log("Screenshots captured:");
  console.log(outputDir);
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  if (performerContext) await performerContext.close().catch(() => null);
  if (receiverContext) await receiverContext.close().catch(() => null);
  if (browser) await browser.close().catch(() => null);
  if (server.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
}

async function shot(page, name) {
  await page.screenshot({ path: join(outputDir, name) });
}

async function captureFlow(performerPage, receiverPage) {
  await performerPage.goto(`${baseURL}/console`);
  await performerPage.getByLabel("Passphrase").fill(passphrase);
  await performerPage.getByRole("button", { name: "Continue" }).click();
  await expect(performerPage.getByRole("heading", { name: "Performer console" })).toBeVisible();
  await performerPage.getByRole("button", { name: "Advanced" }).click();

  await performerPage.getByRole("button", { name: "Create session" }).click();
  const receiverUrl = await performerPage.getByLabel("Direct receiver URL").inputValue();
  await expect(performerPage.locator(".qr-box svg")).toBeVisible();
  await settle();
  await shot(performerPage, "console-session.png");

  await receiverPage.goto(receiverUrl);
  await expect(receiverPage.locator(".search-line")).toBeVisible();
  await expect(performerPage.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
  await settle();
  await shot(receiverPage, "receiver-standby.png");

  await performerPage.getByLabel("Location name").fill("Kuala Lumpur");
  await performerPage.getByLabel("Country").fill("Malaysia");
  await performerPage.getByLabel("Open Maps automatically when sent").uncheck();
  await performerPage.getByRole("button", { name: "Arm" }).click();
  await expect(performerPage.locator(".status-pill--prepared")).toHaveText("Ready");
  await settle();
  await shot(performerPage, "console-armed.png");

  await performerPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(performerPage.locator(".status-pill--delivered")).toHaveText("Delivered");
  await expect(receiverPage.getByRole("heading", { name: "Kuala Lumpur" })).toBeVisible();
  await settle(1200);
  await shot(receiverPage, "reveal-location.png");

  await performerPage.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(receiverPage.locator(".search-line")).toBeVisible();
  await settle();

  await performerPage.getByRole("tab", { name: "Custom text" }).click();
  await performerPage.getByLabel("Reveal text").fill("Violet");
  await performerPage.getByRole("button", { name: "Arm" }).click();
  await expect(performerPage.locator(".status-pill--prepared")).toHaveText("Ready");
  await performerPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(receiverPage.locator(".text-reveal").getByText("Violet")).toBeVisible();
  await settle(1200);
  await shot(receiverPage, "reveal-text.png");

  await performerPage.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(receiverPage.locator(".search-line")).toBeVisible();
  await settle();

  await performerPage.getByRole("tab", { name: "Celebrity" }).click();
  await performerPage.getByLabel("Celebrity name").fill("Taylor Swift");
  await performerPage.getByLabel("Open Google Search automatically when sent").uncheck();
  await performerPage.getByRole("button", { name: "Arm" }).click();
  await expect(performerPage.locator(".status-pill--prepared")).toHaveText("Ready");
  await performerPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(receiverPage.getByRole("heading", { name: "Taylor Swift" })).toBeVisible();
  await settle(1200);
  await shot(receiverPage, "reveal-celebrity.png");
}

async function waitForHealthyServer() {
  const deadline = Date.now() + 120_000;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const [web, api] = await Promise.all([fetch(baseURL), fetch(`${apiBaseURL}/api/health`)]);
      if (web.ok && api.ok) return;
      lastError = `web=${web.status} api=${api.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await settle(500);
  }
  throw new Error(`Timed out waiting for local OpenReveal server. Last error: ${lastError}`);
}

function settle(ms = 900) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
