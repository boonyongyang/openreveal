import { expect, type Page, test } from "@playwright/test";

const performerPassphrase = process.env.PERFORMER_PASSPHRASE ?? "openreveal-dev";

test("spectator can join from root or /j with a session code", async ({ browser, page }) => {
  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();

  for (const joinPath of ["/", "/j"]) {
    const receiverContext = await browser.newContext();
    const receiverPage = await receiverContext.newPage();

    try {
      await page
        .getByRole("button", { name: joinPath === "/" ? "Create session" : "Start new session" })
        .click();
      await page.getByRole("button", { name: "Advanced" }).click();
      const receiverUrl = await page.getByLabel("Direct receiver URL").inputValue();
      const sessionCode = receiverUrl.split("/").pop() ?? "";

      await receiverPage.goto(joinPath);
      await expect(receiverPage.getByRole("heading", { name: "Enter code" })).toBeVisible();
      await expect(receiverPage.getByRole("link", { name: "Open console" })).not.toBeVisible();
      await expect(receiverPage.getByRole("link", { name: "Privacy and safety notes" })).not.toBeVisible();
      await expect(receiverPage.getByRole("link", { name: "Report a safety concern" })).not.toBeVisible();
      await receiverPage.getByLabel("Session code").fill(sessionCode.toLowerCase());
      await receiverPage.getByRole("button", { name: "Join" }).click();

      await expect(receiverPage).toHaveURL(new RegExp(`/r/${sessionCode}$`));
      await expect(receiverPage.locator(".search-line")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
      await receiverPage.goBack({ waitUntil: "domcontentloaded", timeout: 1000 }).catch(() => null);
      await expect(receiverPage).not.toHaveURL(joinPath === "/" ? /\/$/ : /\/j$/);
    } finally {
      await receiverContext.close();
    }
  }
});

test("performer controls a real receiver page end to end", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  const receiverPage = await receiverContext.newPage();

  try {
    await page.goto("/console");
    await waitForApi(page);
    await page.getByLabel("Passphrase").fill(performerPassphrase);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Performer console" })).toBeVisible();

    await page.getByRole("button", { name: "Create session" }).click();
    await page.getByRole("button", { name: "Advanced" }).click();
    const receiverUrl = await page.getByLabel("Direct receiver URL").inputValue();
    expect(receiverUrl).toMatch(/\/r\/[A-Z2-9]+$/);

    await receiverPage.goto(receiverUrl);
    await expect(receiverPage.locator(".search-line")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    await page.getByLabel("Location name").fill("Kuala Lumpur");
    await page.getByLabel("Country").fill("Malaysia");
    await page.getByRole("button", { name: "Arm" }).click();
    await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");
    await expect(page.getByTestId("armed-summary")).toContainText("Location: Kuala Lumpur, Malaysia");
    await expect(receiverPage.getByRole("heading", { name: "Kuala Lumpur" })).not.toBeVisible();
    await expect(receiverPage.locator(".search-line")).toBeVisible();

    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
    await expect(page.getByTestId("last-reveal-latency")).toHaveText(/\d+ ms/);
    await expect(receiverPage.getByRole("heading", { name: "Kuala Lumpur" })).toBeVisible();
    await expect(receiverPage.locator(".reveal-result").getByText("Malaysia")).toBeVisible();
    await expect(receiverPage.getByRole("link", { name: "Open in Maps" })).toHaveAttribute(
      "href",
      /google\.com\/maps\/search/
    );

    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.locator(".status-pill--idle")).toHaveText("No reveal armed");
    await expect(receiverPage.locator(".search-line")).toBeVisible();
    await expect(receiverPage.locator(".result-space")).toBeHidden();
    await expect(receiverPage.getByRole("heading", { name: "Kuala Lumpur" })).not.toBeVisible();

    await page.getByRole("button", { name: "End", exact: true }).click();
    await expect(page.locator(".status-pill--expired")).toHaveText("expired");
    await expect(receiverPage.getByText("This page is no longer active")).toBeVisible();
  } finally {
    await receiverContext.close();
  }
});

test("location reveal can auto-open Maps on the receiver page", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  await receiverContext.route("https://www.google.com/maps/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Maps</title><h1>Maps opened</h1>"
    });
  });
  const receiverPage = await receiverContext.newPage();

  try {
    await page.goto("/console");
    await waitForApi(page);
    await page.getByLabel("Passphrase").fill(performerPassphrase);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create session" }).click();
    await page.getByRole("button", { name: "Advanced" }).click();
    const receiverUrl = await page.getByLabel("Direct receiver URL").inputValue();

    await receiverPage.goto(receiverUrl);
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    await page.getByLabel("Location name").fill("Kuala Lumpur");
    await page.getByLabel("Country").fill("Malaysia");
    await page.getByLabel("Open Maps automatically when sent").check();
    await page.getByRole("button", { name: "Arm" }).click();
    await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");

    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
    await expect(receiverPage).toHaveURL(/google\.com\/maps\/search/);
    await receiverPage.goBack({ waitUntil: "domcontentloaded", timeout: 1000 }).catch(() => null);
    await expect(receiverPage).not.toHaveURL(/\/r\//);
  } finally {
    await receiverContext.close();
  }
});

test("celebrity reveal can auto-open Google Search on the receiver page", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  await receiverContext.route("https://www.google.com/search**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Search</title><h1>Search opened</h1>"
    });
  });
  const receiverPage = await receiverContext.newPage();

  try {
    await page.goto("/console");
    await waitForApi(page);
    await page.getByLabel("Passphrase").fill(performerPassphrase);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create session" }).click();
    await page.getByRole("button", { name: "Advanced" }).click();
    const receiverUrl = await page.getByLabel("Direct receiver URL").inputValue();

    await receiverPage.goto(receiverUrl);
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    await page.getByRole("tab", { name: "Celebrity" }).click();
    await page.getByLabel("Celebrity name").fill("Taylor Swift");
    await page.getByRole("button", { name: "Arm" }).click();
    await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");

    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
    await expect(receiverPage).toHaveURL(/google\.com\/search/);
    await receiverPage.goBack({ waitUntil: "domcontentloaded", timeout: 1000 }).catch(() => null);
    await expect(receiverPage).not.toHaveURL(/\/r\//);
  } finally {
    await receiverContext.close();
  }
});

test("custom text reveal uses centered receiver mode", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  const receiverPage = await receiverContext.newPage();

  try {
    await page.goto("/console");
    await waitForApi(page);
    await page.getByLabel("Passphrase").fill(performerPassphrase);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create session" }).click();
    await page.getByRole("button", { name: "Advanced" }).click();
    const receiverUrl = await page.getByLabel("Direct receiver URL").inputValue();

    await receiverPage.goto(receiverUrl);
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    await page.getByRole("tab", { name: "Custom text" }).click();
    await expect(page.getByLabel("Reveal text")).toHaveValue("");
    await page.getByLabel("Reveal text").fill("Violet");
    await page.getByRole("button", { name: "Arm" }).click();
    await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");

    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
    await expect(receiverPage.locator(".text-reveal")).toBeVisible();
    await expect(receiverPage.locator(".text-reveal").getByText("Violet")).toBeVisible();
    await expect(receiverPage.locator(".search-line")).not.toBeVisible();
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
