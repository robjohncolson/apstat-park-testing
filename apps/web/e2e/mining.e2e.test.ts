import { test, expect } from "@playwright/test";

// -----------------------------------------------------------------------------
// Happy-Path E2E: Completing a lesson triggers the mining puzzle, the user
// solves it, and the leaderboard updates. This relies on the BlockchainService
// singleton being exposed to window as __APSTAT_CHAIN_SERVICE__.
// -----------------------------------------------------------------------------

test.describe("Happy Path – Lesson → Block Mining", () => {
  // Ensure each test starts with a clean client-side chain DB & key store
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      indexedDB.deleteDatabase("APStatChainDB");
      localStorage.clear();
    });
  });

  test("user completes lesson, mines a block, and sees leaderboard update", async ({ page }) => {
    // --- Login flow ----------------------------------------------------------
    await page.goto("/?msw=true");
    await page.waitForTimeout(2000); // allow MSW + username generation
    await page.getByRole("button", { name: /Continue as/ }).click();
    await expect(page).toHaveURL(/dashboard/);

    // --- Navigate to the first lesson ---------------------------------------
    // Expand the first unit accordion (if collapsed)
    const firstUnitHeader = page.locator(".unit-header").first();
    await firstUnitHeader.click();

    // Open the first topic link
    await page.locator("a.topic-link").first().click();
    await expect(page).toHaveURL(/\/unit\/.*\/lesson\//);

    // --- Complete a video ----------------------------------------------------
    const markVideoBtn = page
      .getByRole("button", { name: /Mark as Watched/i })
      .first();
    if (await markVideoBtn.isVisible()) {
      await markVideoBtn.click();
    }

    // --- Force-trigger mining puzzle (test-only) ----------------------------
    await page.evaluate(() => {
      const svc: any = (window as any).__APSTAT_CHAIN_SERVICE__;
      if (svc && typeof svc["updateState"] === "function") {
        svc.updateState({
          isProposalRequired: true,
          puzzleData: {
            questionId: "test-q1",
            lessonId: "test-lesson",
            questionText: "2 + 2 = ?",
            answers: ["1", "2", "3", "4"],
            correctAnswerIndex: 3,
          },
        });
      }
    });

    // --- Solve the puzzle ----------------------------------------------------
    await expect(
      page.getByRole("heading", { name: /Solve the Puzzle/i }),
    ).toBeVisible();

    // Select the correct answer (index 3 ➜ value "3") and submit
    await page.locator('input[name="puzzle-answer"][value="3"]').check();
    await page.getByRole("button", { name: "Submit" }).click();

    // Wait until the modal disappears
    await expect(
      page.getByRole("heading", { name: /Solve the Puzzle/i }),
    ).toBeHidden();

    // --- Verify leaderboard shows updated data ------------------------------
    await page.getByRole("link", { name: "🏆 Leaderboard" }).click();
    await expect(page).toHaveURL("/leaderboard");

    // The placeholder leaderboard from BlockchainService should include "Your Rank"
    await expect(page.getByRole("heading", { name: /Your Rank/i })).toBeVisible();
  });
}); 