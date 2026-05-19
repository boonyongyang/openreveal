import { expect, type Page, test } from "@playwright/test";

test("performer controls a real receiver page end to end", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  const receiverPage = await receiverContext.newPage();

  try {
    await page.goto("/console");
    await waitForApi(page);
    await page.getByLabel("Passphrase").fill("openreveal-dev");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Performer console" })).toBeVisible();

    await page.getByRole("button", { name: "Create session" }).click();
    const receiverUrl = await page.getByLabel("Receiver URL").inputValue();
    expect(receiverUrl).toMatch(/\/r\/[A-Z2-9]+$/);

    await receiverPage.goto(receiverUrl);
    await expect(receiverPage.getByText("Search anything")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    await page.getByLabel("Location name").fill("Kuala Lumpur");
    await page.getByLabel("Country").fill("Malaysia");
    await page.getByRole("button", { name: "Arm" }).click();
    await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
    await expect(page.getByTestId("armed-summary")).toContainText("Location: Kuala Lumpur, Malaysia");
    await expect(receiverPage.getByRole("heading", { name: "Kuala Lumpur" })).not.toBeVisible();
    await expect(receiverPage.getByText("Search anything")).toBeVisible();

    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
    await expect(page.getByTestId("last-reveal-latency")).toHaveText(/\d+ ms/);
    await expect(receiverPage.getByRole("heading", { name: "Kuala Lumpur" })).toBeVisible();
    await expect(receiverPage.getByText("Malaysia")).toBeVisible();
    await expect(receiverPage.getByRole("link", { name: "Open in Maps" })).toHaveAttribute(
      "href",
      /google\.com\/maps\/search/
    );

    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.locator(".status-pill--idle")).toHaveText("No reveal armed");
    await expect(receiverPage.getByText("Standing by")).toBeVisible();
    await expect(receiverPage.getByRole("heading", { name: "Kuala Lumpur" })).not.toBeVisible();

    await page.getByRole("button", { name: "End", exact: true }).click();
    await expect(page.locator(".status-pill--expired")).toHaveText("expired");
    await expect(receiverPage.getByText("This page is no longer active")).toBeVisible();
  } finally {
    await receiverContext.close();
  }
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
