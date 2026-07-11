// Shared helpers for the trick-mechanics e2e specs (decoy / maps-redirect /
// back-trap). Filename intentionally does NOT end in `.pw.ts` so Playwright's
// testMatch ignores it as a spec file.
import { expect, type Page } from "@playwright/test";

export const performerPassphrase = process.env.PERFORMER_PASSPHRASE ?? "openreveal-dev";

// Real Google Maps target the receiver redirects to on a location reveal.
// Glob matches buildMapsUrl() output in apps/api/src/effects/location.ts.
export const MAPS_URL_GLOB = "**/maps/search/**";

export interface CreatedSession {
  receiverUrl: string;
  code: string;
}

export async function waitForApi(page: Page) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get("http://localhost:4000/api/health").catch(() => null);
        return response?.ok() ?? false;
      },
      { timeout: 30_000 }
    )
    .toBe(true);
}

export async function createSession(page: Page): Promise<CreatedSession> {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Performer console" })).toBeVisible();
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Advanced" }).click();
  const receiverUrl = await page.getByLabel("Direct receiver URL").inputValue();
  expect(receiverUrl).toMatch(/\/[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  const code = new URL(receiverUrl).pathname.split("/").filter(Boolean).pop()!;
  return { receiverUrl, code };
}

// Arm + send a Kuala Lumpur location reveal with Maps auto-open LEFT ON (the
// real trick default). Performer-side assertions only. The receiver navigates
// away on send, so callers handle the redirect.
export async function sendLocationRevealWithMaps(page: Page) {
  await page.getByLabel("Location name").fill("Kuala Lumpur");
  await page.getByLabel("Country").fill("Malaysia");
  await expect(page.getByLabel("Open Maps automatically when sent")).toBeChecked();
  await page.getByRole("button", { name: "Arm" }).click();
  await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
}

// Intercept the receiver's redirect to Google Maps with a local stub so CI
// never hits the real network. Returns nothing; install before sending.
export async function stubMaps(page: Page) {
  await page.route(MAPS_URL_GLOB, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>maps-stub</title><h1>Maps stub</h1>"
    })
  );
}
