import { test, expect } from "@playwright/test";

// Threshold for visual diffs – allows minor anti-aliasing differences.
const diffThreshold = 0.02; // 2 %

test.describe("Visual regression", () => {
  test("Login page – desktop", async ({ page }) => {
    await page.goto("http://localhost:5173/?msw=true");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login-desktop.png", {
      fullPage: true,
      maxDiffPixelRatio: diffThreshold,
    });
  });

  test("Dashboard – after login", async ({ page }) => {
    // Navigate to login with MSW so the mocked username button is deterministic
    await page.goto("http://localhost:5173/?msw=true");
    // Click the Continue button
    await page.getByRole("button", { name: /Continue as mocked-user-123/i }).click();
    // Wait for dashboard content
    await page.getByRole("heading", { name: /Your Learning Journey/i });
    await expect(page).toHaveScreenshot("dashboard-desktop.png", {
      fullPage: true,
      maxDiffPixelRatio: diffThreshold,
    });
  });
}); 