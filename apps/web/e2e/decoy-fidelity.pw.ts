import { expect, test } from "@playwright/test";

import { createSession } from "./_support.js";

// The spectator standby must read as a believable search homepage and must
// never leak app/brand chrome that would tip off the audience.
test("spectator standby renders a believable, brand-free search homepage", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  const receiverPage = await receiverContext.newPage();

  try {
    const { receiverUrl } = await createSession(page);
    await receiverPage.goto(receiverUrl);

    // Logo: four colored dots.
    await expect(receiverPage.locator(".search-home__logo")).toBeVisible();
    for (const variant of ["b", "r", "y", "g"]) {
      await expect(receiverPage.locator(`.search-dot--${variant}`)).toBeVisible();
    }

    // Search bar: real, focusable input with the iOS no-zoom font size.
    const input = receiverPage.locator(".search-line__input");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("placeholder", "Search");
    await expect(input).toHaveAttribute("inputmode", "search");
    await input.click();
    await expect(input).toBeFocused();
    await input.fill("weather");
    await expect(input).toHaveValue("weather");
    const fontSize = await input.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(fontSize).toBe("16px");

    // Mic + lens icons and shortcut chips present.
    await expect(receiverPage.locator(".search-line__mic")).toBeVisible();
    await expect(receiverPage.locator(".search-line__lens")).toBeVisible();
    await expect(receiverPage.locator(".search-chip")).toHaveCount(3);

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
