import { expect, type Page, test } from "@playwright/test";

const performerPassphrase = process.env.PERFORMER_PASSPHRASE ?? "openreveal-dev";

test("receiver reload restores the latest sent reveal", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  const receiverPage = await receiverContext.newPage();

  try {
    const receiverUrl = await createSession(page);
    await receiverPage.goto(receiverUrl);
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    await sendLocationReveal(page, receiverPage, "Reloaded reveal");
    await receiverPage.reload();
    await expect(receiverPage.getByRole("heading", { name: "Reloaded reveal" })).toBeVisible();
    await expect(receiverPage.locator(".reveal-result").getByText("Malaysia")).toBeVisible();
  } finally {
    await receiverContext.close();
  }
});

test("new receiver restores the latest sent reveal after original receiver leaves", async ({ browser, page }) => {
  const firstReceiverContext = await browser.newContext();
  const firstReceiverPage = await firstReceiverContext.newPage();
  const secondReceiverContext = await browser.newContext();
  const secondReceiverPage = await secondReceiverContext.newPage();

  try {
    const receiverUrl = await createSession(page);
    await firstReceiverPage.goto(receiverUrl);
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    await sendLocationReveal(page, firstReceiverPage, "Restored reveal");
    await firstReceiverContext.close();
    await expect(page.getByRole("heading", { name: "Disconnected" })).toBeVisible();

    await secondReceiverPage.goto(receiverUrl);
    await expect(secondReceiverPage.getByRole("heading", { name: "Restored reveal" })).toBeVisible();
    await expect(secondReceiverPage.locator(".reveal-result").getByText("Malaysia")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
  } finally {
    await secondReceiverContext.close();
  }
});

test("different receiver device is rejected while the original receiver is active", async ({ browser, page }) => {
  const firstReceiverContext = await browser.newContext();
  const firstReceiverPage = await firstReceiverContext.newPage();
  const secondReceiverContext = await browser.newContext();
  const secondReceiverPage = await secondReceiverContext.newPage();

  try {
    const receiverUrl = await createSession(page);
    await firstReceiverPage.goto(receiverUrl);
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    await secondReceiverPage.goto(receiverUrl);
    await expect(secondReceiverPage.getByText("This session is already open elsewhere")).toBeVisible();
    await expect(firstReceiverPage.locator(".search-line")).toBeVisible();
  } finally {
    await firstReceiverContext.close();
    await secondReceiverContext.close();
  }
});

async function createSession(page: Page) {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Performer console" })).toBeVisible();
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Advanced" }).click();
  const receiverUrl = await page.getByLabel("Direct receiver URL").inputValue();
  expect(receiverUrl).toMatch(/\/[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  return receiverUrl;
}

async function sendLocationReveal(page: Page, receiverPage: Page, locationName: string) {
  await page.getByLabel("Location name").fill(locationName);
  await page.getByLabel("Country").fill("Malaysia");
  // Keep the in-app reveal (default now redirects to Google Maps on send).
  await page.getByLabel("Open Maps automatically when sent").uncheck();
  await page.getByRole("button", { name: "Arm" }).click();
  await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
  await expect(receiverPage.getByRole("heading", { name: locationName })).not.toBeVisible();
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
  await expect(receiverPage.getByRole("heading", { name: locationName })).toBeVisible();
}

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
