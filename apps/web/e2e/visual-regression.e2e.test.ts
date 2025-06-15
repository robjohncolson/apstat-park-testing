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

  test("Lesson page – desktop", async ({ page }) => {
    // Inject mock user into localStorage to bypass login
    const mockUser = {
      id: 123,
      username: "visual-reg-tester",
      created_at: new Date().toISOString(),
      last_sync: new Date().toISOString(),
    };
    await page.addInitScript((userString) => {
      window.localStorage.setItem("apstat-user", userString as string);
    }, JSON.stringify(mockUser));

    await page.goto("http://localhost:5173/unit/unit1/lesson/1-1?msw=true");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("lesson-desktop.png", {
      fullPage: true,
      maxDiffPixelRatio: diffThreshold,
    });
  });

  test("Lesson page – Workflow Explainer modal", async ({ page }) => {
    const mockUser = {
      id: 456,
      username: "visual-reg-tester",
      created_at: new Date().toISOString(),
      last_sync: new Date().toISOString(),
    };
    await page.addInitScript((userString) => {
      window.localStorage.setItem("apstat-user", userString as string);
    }, JSON.stringify(mockUser));

    await page.goto("http://localhost:5173/unit/unit1/lesson/1-1?msw=true");
    await page.waitForLoadState("networkidle");

    // Open the help modal ("?" button with accessible label)
    await page.getByRole("button", { name: "How to use the AI Quiz Tutor" }).click();
    // Wait for dialog to appear
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    await expect(modal).toHaveScreenshot("lesson-modal.png", {
      maxDiffPixelRatio: diffThreshold,
    });
  });
}); 