import { readFile, writeFile } from "node:fs/promises";

import { expect, type Page, test } from "@playwright/test";

const performerPassphrase = process.env.PERFORMER_PASSPHRASE ?? "openreveal-dev";

test("privacy page is reachable with anti-framing headers", async ({ page }) => {
  const response = await page.goto("/privacy");

  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  await expect(page.getByRole("heading", { name: "Privacy and use" })).toBeVisible();
  await expect(page.getByText("No cloned third-party pages")).toBeVisible();
});

test("report page gives hosted-instance abuse reporting guidance", async ({ page }) => {
  const response = await page.goto("/report");

  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  await expect(page.getByRole("heading", { name: "Report a safety concern" })).toBeVisible();
  await expect(page.getByText("The hosted instance URL.")).toBeVisible();
  await expect(page.getByText("VITE_ABUSE_REPORT_URL")).toBeVisible();
});

test("home page is the minimal spectator join page with installable PWA metadata", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Enter code" })).toBeVisible();
  await expect(page.getByLabel("Session code")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open console" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy and safety notes" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Report a safety concern" })).not.toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#191713");

  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(manifest.headers()["content-type"]).toContain("application/manifest+json");
  expect((await manifest.json()).display).toBe("standalone");

  const icon = await page.request.get("/icons/openreveal-icon.svg");
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");
});

test("about page keeps the public project overview", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByRole("heading", { name: "OpenReveal" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open console" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy and safety notes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Report a safety concern" })).toBeVisible();
});

test("performer can log in and create a session", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Performer console" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick session" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByRole("heading", { name: "Ready when you are" })).toBeVisible();
  await page.getByRole("button", { name: "Create session" }).click();

  await expect(page.getByText("in the phone browser")).toBeVisible();
  await expect(page.locator(".quick-session__code")).toHaveText(/\d{3}/);
  await expect(page.locator(".qr-box svg")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy site" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible();
  await expect(page.getByText("Direct receiver URL")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Copy URL" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Demo mode" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Start new session" })).toBeVisible();
  await expect(page.getByText("Starting a new session abandons the current receiver link.")).toBeVisible();
  await expect(page.getByText(/Expires in \d+m/)).toBeVisible();
  await page.getByRole("button", { name: "Advanced" }).click();
  await expect(page.getByText("Direct receiver URL")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy URL" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Demo mode" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Session log" })).toBeVisible();
});

test("performer can arm and send a location reveal in demo mode", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Advanced" }).click();
  await page.getByRole("button", { name: "Demo mode" }).click();

  await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
  await page.getByLabel("Location name").fill("Kuala Lumpur");
  await page.getByLabel("Country").fill("Malaysia");
  await page.getByRole("button", { name: "Arm" }).click();
  await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
  await expect(page.getByTestId("armed-summary")).toContainText("Location: Kuala Lumpur, Malaysia");
  await expect(page.getByTestId("send-disabled-reason")).toHaveText("Send: Ready to trigger");

  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
  await expect(page.getByTestId("last-reveal-latency")).toHaveText(/\d+ ms/);
  await expect(page.locator(".demo-pane").getByRole("heading", { name: "Kuala Lumpur" })).toBeVisible();
  await expect(page.locator(".demo-pane").getByRole("link", { name: "Open in Maps" })).toHaveAttribute(
    "href",
    /google\.com\/maps\/search/
  );
  await expect(page.getByText(/Last seen/)).toBeVisible();
});

test("location form stays in manual mode when Places is not configured", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByLabel("Place search")).toBeDisabled();
  await expect(page.getByText("Manual fallback available")).toBeVisible();
  await expect(page.getByLabel("Location name")).toBeEnabled();
});

test("performer can select a Places prediction to prefill location fields", async ({ page }) => {
  await page.route("**/api/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ places: { enabled: true } })
    });
  });
  await page.route("**/api/places/autocomplete", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        predictions: [
          {
            placeId: "place-petronas",
            text: "Petronas Twin Towers, Kuala Lumpur, Malaysia",
            mainText: "Petronas Twin Towers",
            secondaryText: "Kuala Lumpur, Malaysia"
          }
        ]
      })
    });
  });
  await page.route("**/api/places/place-petronas", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        place: {
          placeId: "place-petronas",
          name: "Petronas Twin Towers",
          formattedAddress: "Petronas Twin Towers, Kuala Lumpur, Malaysia",
          lat: 3.1579,
          lng: 101.7116
        }
      })
    });
  });

  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Place search").fill("petronas");
  await page.getByRole("button", { name: /Petronas Twin Towers/ }).click();

  await expect(page.getByLabel("Location name")).toHaveValue("Petronas Twin Towers");
  await expect(page.getByLabel("Country")).toHaveValue("Malaysia");
  await expect(page.getByLabel("Latitude")).toHaveValue("3.1579");
  await expect(page.getByLabel("Longitude")).toHaveValue("101.7116");
  await expect(page.getByLabel("Open Maps automatically when sent")).toBeChecked();
  await expect(page.getByText("Precise Maps marker selected")).toBeVisible();
});

test("performer can arm and send a celebrity reveal in demo mode", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Advanced" }).click();
  await page.getByRole("button", { name: "Demo mode" }).click();

  await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
  await page.getByRole("tab", { name: "Celebrity" }).click();
  await page.getByLabel("Celebrity name").fill("Taylor Swift");
  await expect(page.getByLabel("Subtitle")).toHaveValue("Musician");
  await page.getByRole("button", { name: "Arm" }).click();
  await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
  await expect(page.getByTestId("armed-summary")).toContainText("Celebrity: Taylor Swift · Musician");

  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
  await expect(page.getByTestId("last-reveal-latency")).toHaveText(/\d+ ms/);
  await expect(page.locator(".demo-pane").getByRole("heading", { name: "Taylor Swift" })).toBeVisible();
  await expect(page.locator(".demo-pane").getByRole("link", { name: "Search" })).toHaveAttribute(
    "href",
    /google\.com\/search/
  );
});

test("performer can arm and send a custom text reveal in demo mode", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Advanced" }).click();
  await page.getByRole("button", { name: "Demo mode" }).click();

  await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
  await page.getByRole("tab", { name: "Custom text" }).click();
  await expect(page.getByLabel("Reveal text")).toHaveValue("");
  await expect(page.getByLabel("Title")).not.toBeVisible();
  await expect(page.getByLabel("Footer")).not.toBeVisible();
  await page.getByLabel("Reveal text").fill("Impossible");
  await page.getByRole("button", { name: "Arm" }).click();
  await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
  await expect(page.getByTestId("armed-summary")).toContainText("Custom text: Impossible");

  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
  await expect(page.getByTestId("last-reveal-latency")).toHaveText(/\d+ ms/);
  await expect(page.locator(".demo-pane .text-reveal").getByText("Impossible")).toBeVisible();
  await expect(page.locator(".demo-pane .search-line")).not.toBeVisible();
});

test("performer can export and import local JSON presets", async ({ page }, testInfo) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Advanced" }).click();
  await page.getByRole("button", { name: "Demo mode" }).click();

  await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
  await page.getByRole("tab", { name: "Custom text" }).click();
  await page.getByLabel("Reveal text").fill("This message came from a local preset.");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export preset" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("this-message-came-from-a-local-preset.openreveal-preset.json");
  const exportedPath = await download.path();
  expect(exportedPath).toBeTruthy();
  const exported = JSON.parse(await readFile(exportedPath!, "utf8")) as {
    input: { body?: string };
    kind: string;
    schema: string;
  };
  expect(exported.schema).toBe("openreveal.effect-preset.v1");
  expect(exported.kind).toBe("custom_text");
  expect(exported.input.body).toBe("This message came from a local preset.");

  const importPath = testInfo.outputPath("custom-text-preset.json");
  await writeFile(
    importPath,
    JSON.stringify({
      schema: "openreveal.effect-preset.v1",
      kind: "custom_text",
      label: "Imported prediction",
      input: {
        body: "Imported from a JSON preset."
      }
    })
  );

  await page.getByLabel("Reveal text").fill("Draft before import");
  await page.getByLabel("Import preset file").setInputFiles(importPath);
  await expect(page.getByLabel("Reveal text")).toHaveValue("Imported from a JSON preset.");

  await page.getByRole("button", { name: "Arm" }).click();
  await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
  await expect(page.getByTestId("armed-summary")).toContainText("Custom text: Imported from a JSON preset.");
});

test("ending a session makes performer mutation controls read-only", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page.getByText("in the phone browser")).toBeVisible();

  await page.getByRole("button", { name: "End", exact: true }).click();

  await expect(page.locator(".status-pill--expired")).toHaveText("expired");
  await expect(page.getByTestId("arm-disabled-reason")).toHaveText("Arm: Session ended");
  await expect(page.getByRole("button", { name: "Arm" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "End", exact: true })).toBeDisabled();
});

async function waitForApi(page: Page) {
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
