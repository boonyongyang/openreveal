#!/usr/bin/env node
// One-off proof run: drives the LIVE deployment with the real WebKit engine
// (the engine iOS Safari uses) at an iPhone 13 profile, through a full trick
// round, capturing screenshots as evidence. Not part of CI.
import { devices, expect, webkit } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const base = process.env.LIVE_BASE_URL ?? "https://openreveal-tcug7qrd2a-as.a.run.app";
const passphrase = process.env.LIVE_PASSPHRASE ?? "openreveal-first-test";
const outDir = resolve(process.env.OUT_DIR ?? "/tmp/openreveal-safari");
await mkdir(outDir, { recursive: true });

const browser = await webkit.launch();
const consoleCtx = await browser.newContext();
const phoneCtx = await browser.newContext({ ...devices["iPhone 13"] });
const console_ = await consoleCtx.newPage();
const phone = await phoneCtx.newPage();
const log = (m) => process.stdout.write(`• ${m}\n`);

async function waitForMapsUrl(page, timeout) {
  try {
    await page.waitForURL("**/maps/**", { timeout });
  } catch (error) {
    for (let index = 0; index < 20; index += 1) {
      if (page.url().includes("/maps")) return;
      await page.waitForTimeout(250).catch(() => {});
    }
    throw error;
  }
}

try {
  // --- Performer console (desktop Safari engine) ---
  await console_.goto(`${base}/console`);
  await console_.getByLabel("Passphrase").fill(passphrase);
  await console_.getByRole("button", { name: "Continue" }).click();
  await expect(console_.getByRole("heading", { name: "Performer console" })).toBeVisible({ timeout: 15_000 });
  await console_.getByRole("button", { name: "Create session" }).click();
  await console_.getByRole("button", { name: "Advanced" }).click();
  const receiverUrl = await console_.getByLabel("Direct receiver URL").inputValue();
  const code = new URL(receiverUrl).pathname.split("/").filter(Boolean).pop();
  expect(receiverUrl).toMatch(/^https:\/\/openreveal\.web\.app\/[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  log(`session created: spectator URL ${receiverUrl} (code ${code})`);

  // --- Spectator phone (iPhone 13 WebKit) on standby ---
  await phone.goto(receiverUrl);
  await expect(phone.locator(".search-line")).toBeVisible();
  await expect(console_.getByRole("heading", { name: "Foregrounded" })).toBeVisible({ timeout: 15_000 });
  await phone.screenshot({ path: join(outDir, "1-standby-decoy.png") });
  log("standby decoy rendered on iPhone Safari");

  // Standby is visual only, with no field or control that could expose the app.
  await expect(phone.locator(".search-line__placeholder")).toHaveText("Search");
  await expect(phone.locator(".search-line__input")).toHaveCount(0);
  await expect(phone.getByRole("textbox")).toHaveCount(0);
  await expect(phone.getByRole("button")).toHaveCount(0);
  await expect(phone.getByRole("link")).toHaveCount(0);
  log("standby surface is inert and exposes no interactive controls");

  // --- Performer arms + sends a location reveal (Maps auto-open ON) ---
  await console_.getByLabel("Location name").fill("Kuala Lumpur");
  await console_.getByLabel("Country").fill("Malaysia");
  await expect(console_.getByLabel("Open Maps automatically when sent")).toBeChecked();
  await console_.getByRole("button", { name: "Arm" }).click();
  await expect(console_.locator(".status-pill--prepared")).toHaveText("Ready");
  await console_.screenshot({ path: join(outDir, "2-console-armed.png") });
  await console_.getByRole("button", { name: "Send", exact: true }).click();
  await expect(console_.locator(".status-pill--delivered")).toHaveText("Delivered");
  log("performer sent the reveal");

  // --- Spectator phone redirects to real Google Maps ---
  await waitForMapsUrl(phone, 30_000);
  log(`phone redirected → ${phone.url().slice(0, 80)}…`);
  await phone.waitForTimeout(2500);
  await phone.screenshot({ path: join(outDir, "3-maps-redirect.png") });

  // --- Back-trap: restore receiver + fire pageshow, must bounce to Maps ---
  await phone.goto(receiverUrl);
  await expect(phone.locator(".search-line")).toBeVisible();
  await phone.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await waitForMapsUrl(phone, 15_000);
  if (phone.url().includes("/console")) throw new Error("LEAK: back exposed the app");
  log("back-trap held: restored receiver bounced straight back to Maps, no app leak");
  await phone.waitForTimeout(2000);
  await phone.screenshot({ path: join(outDir, "4-back-trap.png") });

  log(`\nPASS. Screenshots in ${outDir}`);
} catch (error) {
  await console_.screenshot({ path: join(outDir, "error-console.png") }).catch(() => {});
  await phone.screenshot({ path: join(outDir, "error-phone.png") }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
