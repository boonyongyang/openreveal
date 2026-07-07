import { expect, test } from "@playwright/test";

import { createSession } from "./_support.js";

// The spectator standby must read as a quiet, brand-free search-like surface
// and must never leak app/brand chrome that would tip off the audience.
test("spectator standby renders a quiet, inert, brand-free search surface", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  const receiverPage = await receiverContext.newPage();

  try {
    const { receiverUrl } = await createSession(page);
    await receiverPage.goto(receiverUrl);

    // Original abstract mark, not a third-party logo.
    await expect(receiverPage.locator(".search-mark")).toBeVisible();
    await expect(receiverPage.locator(".search-mark__orb")).toHaveCount(2);

    // Search bar: visual only. It must not focus or summon a keyboard.
    const searchLine = receiverPage.locator(".search-line");
    await expect(searchLine).toBeVisible();
    await expect(receiverPage.locator(".search-line__placeholder")).toHaveText("Search");
    await expect(receiverPage.locator(".search-line__input")).toHaveCount(0);
    await expect(receiverPage.getByRole("textbox")).toHaveCount(0);
    await searchLine.click();
    expect(await receiverPage.evaluate(() => document.activeElement?.classList.contains("search-line"))).toBe(false);
    const fontSize = await receiverPage.locator(".search-line__placeholder").evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(fontSize).toBe("16px");

    // No fake controls or internal status dots on the spectator surface.
    await expect(receiverPage.locator(".search-line__mic")).toHaveCount(0);
    await expect(receiverPage.locator(".search-line__lens")).toHaveCount(0);
    await expect(receiverPage.locator(".search-chip")).toHaveCount(0);
    await expect(receiverPage.locator(".receiver-signals")).toHaveCount(0);
    await expect(receiverPage.getByRole("button")).toHaveCount(0);
    await expect(receiverPage.getByRole("link")).toHaveCount(0);

    // No app/brand leak: nothing that would expose the trick to the audience.
    const body = (await receiverPage.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("openreveal");
    expect(body).not.toContain("performer");
    expect(body).not.toContain("passphrase");
    expect(body).not.toContain("session code");
    await expect(receiverPage.getByText(/reveal/i)).toHaveCount(0);
  } finally {
    await receiverContext.close();
  }
});
