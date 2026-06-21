import { expect, test } from "@playwright/test";

import { createSession, sendLocationRevealWithMaps, stubMaps } from "./_support.js";

// Security-critical: after the reveal hands off to Maps, a Back gesture on the
// spectator phone must NOT expose the controlled app/URL. iOS Safari can
// restore the receiver from bfcache; the `pageshow` back-trap bounces it
// straight back to the reveal target.
//
// Limitation: Chromium cannot fully replicate iOS Safari bfcache timing, so
// this verifies the bounce LOGIC (persisted handoff + pageshow handler).
// A real phone remains the final acceptance gate.
test("pageshow back-trap re-redirects a restored receiver, never showing the app", async ({ browser, page }) => {
  const receiverContext = await browser.newContext();
  const receiverPage = await receiverContext.newPage();

  try {
    const { receiverUrl } = await createSession(page);
    await stubMaps(receiverPage);
    await receiverPage.goto(receiverUrl);
    await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

    // Perform the reveal — receiver redirects to the Maps stub.
    await sendLocationRevealWithMaps(page);
    await receiverPage.waitForURL("**/maps/search/**");

    // Simulate iOS bfcache restoring the receiver in the same tab (handoff key
    // persisted in this tab's sessionStorage), then fire the back-restore event.
    await receiverPage.goto(receiverUrl);
    await expect(receiverPage.locator(".search-line")).toBeVisible();

    // Dispatch pageshow until the bounce fires — the listener attaches in a
    // post-paint effect, so a single dispatch can race ahead of it.
    await expect
      .poll(
        async () => {
          await receiverPage
            .evaluate(() =>
              window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))
            )
            .catch(() => {});
          return receiverPage.url();
        },
        { timeout: 10_000 }
      )
      .toContain("/maps/search/");

    // Bounce must send it back to Maps, not leave it on the app.
    await receiverPage.waitForURL("**/maps/search/**");
    await expect(receiverPage.getByText("Maps stub")).toBeVisible();
    expect(receiverPage.url()).not.toContain("/console");
    await expect(receiverPage.locator(".search-line")).toHaveCount(0);
  } finally {
    await receiverContext.close();
  }
});
