import { expect, test } from "@playwright/test";

import { createSession, sendLocationRevealWithMaps, stubMaps } from "./_support.js";

// The core trick payload: with Maps auto-open ON (the default), sending a
// location reveal must navigate the spectator phone straight to a prefilled
// Google Maps for that place — not show an in-app reveal.
test("location reveal redirects the spectator to prefilled Google Maps", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  const receiverPage = await receiverContext.newPage();

  try {
    const { receiverUrl } = await createSession(page);
    await stubMaps(receiverPage);
    await receiverPage.goto(receiverUrl);
    await expect(receiverPage.locator(".search-line")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    await sendLocationRevealWithMaps(page);

    // Spectator left the app and landed on the prefilled Maps target.
    await receiverPage.waitForURL("**/maps/search/**");
    const url = receiverPage.url();
    expect(url).toContain("query=");
    expect(decodeURIComponent(url)).toContain("Kuala Lumpur");
    expect(decodeURIComponent(url)).toContain("Malaysia");
    await expect(receiverPage.getByText("Maps stub")).toBeVisible();
    // (Persistence of the handoff URL is exercised by back-trap.pw.ts; it lives
    // on the app origin and can't be read here from the google.com stub origin.)
  } finally {
    await receiverContext.close();
  }
});
