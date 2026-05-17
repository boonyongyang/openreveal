import { readFile, writeFile } from "node:fs/promises";

import { expect, type Page, test } from "@playwright/test";

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

test("performer can log in and create a session", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill("openreveal-dev");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Performer console" })).toBeVisible();
  await page.getByRole("button", { name: "Create session" }).click();

  await expect(page.getByText("Receiver URL")).toBeVisible();
  await expect(page.locator(".qr-box svg")).toBeVisible();
  await expect(page.getByRole("button", { name: "Demo mode" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Start new session" })).toBeVisible();
  await expect(page.getByText("Starting a new session abandons the current receiver link.")).toBeVisible();
  await expect(page.getByText(/Expires in \d+m/)).toBeVisible();
});

test("performer can arm and send a location reveal in demo mode", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill("openreveal-dev");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
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
  await expect(page.locator(".receiver-history")).toContainText("Foregrounded");
});

test("performer can arm and send a celebrity reveal in demo mode", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill("openreveal-dev");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
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
});

test("performer can arm and send a custom text reveal in demo mode", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill("openreveal-dev");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Demo mode" }).click();

  await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
  await page.getByRole("tab", { name: "Custom text" }).click();
  await page.getByLabel("Title").fill("Prediction");
  await page.getByLabel("Message").fill("The word you named was horizon.");
  await page.getByLabel("Footer").fill("OpenReveal");
  await page.getByRole("button", { name: "Arm" }).click();
  await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
  await expect(page.getByTestId("armed-summary")).toContainText("Custom text: Prediction");

  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
  await expect(page.getByTestId("last-reveal-latency")).toHaveText(/\d+ ms/);
  await expect(page.locator(".demo-pane").getByRole("heading", { name: "Prediction" })).toBeVisible();
  await expect(page.locator(".demo-pane").getByText("The word you named was horizon.")).toBeVisible();
});

test("performer can export and import local JSON presets", async ({ page }, testInfo) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill("openreveal-dev");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Demo mode" }).click();

  await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
  await page.getByRole("tab", { name: "Custom text" }).click();
  await page.getByLabel("Title").fill("Exported prediction");
  await page.getByLabel("Message").fill("This message came from a local preset.");
  await page.getByLabel("Footer").fill("Local JSON");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export preset" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("exported-prediction.openreveal-preset.json");
  const exportedPath = await download.path();
  expect(exportedPath).toBeTruthy();
  const exported = JSON.parse(await readFile(exportedPath!, "utf8")) as {
    input: { body?: string; footer?: string; title?: string };
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
        title: "Imported prediction",
        body: "Imported from a JSON preset.",
        footer: "Preset file"
      }
    })
  );

  await page.getByLabel("Title").fill("Draft before import");
  await page.getByLabel("Import preset file").setInputFiles(importPath);
  await expect(page.getByLabel("Title")).toHaveValue("Imported prediction");
  await expect(page.getByLabel("Message")).toHaveValue("Imported from a JSON preset.");
  await expect(page.getByLabel("Footer")).toHaveValue("Preset file");

  await page.getByRole("button", { name: "Arm" }).click();
  await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
  await expect(page.getByTestId("armed-summary")).toContainText("Custom text: Imported prediction");
});

test("ending a session makes performer mutation controls read-only", async ({ page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill("openreveal-dev");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();

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
