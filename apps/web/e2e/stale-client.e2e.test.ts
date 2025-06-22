import { test, expect } from "@playwright/test";

// -----------------------------------------------------------------------------
// Stale Client E2E: A browser with an old chain should immediately show the
// "Syncing…" status indicator after login.
// -----------------------------------------------------------------------------

test.describe("Stale Client Sync Indicator", () => {
  test.beforeEach(async ({ context }) => {
    // Pre-populate (or reset) the chain DB to simulate an outdated state by
    // simply clearing it – the service will treat it as needing sync.
    await context.addInitScript(() => {
      indexedDB.deleteDatabase("APStatChainDB");
    });
  });

  test("shows syncing banner on dashboard when client is out of date", async ({ page }) => {
    // --- Login flow ----------------------------------------------------------
    await page.goto("/?msw=true");
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: /Continue as/ }).click();
    await expect(page).toHaveURL("/dashboard");

    // --- Assert that syncing indicator is visible ---------------------------
    await expect(page.getByText(/Syncing/i)).toBeVisible();
  });
}); 