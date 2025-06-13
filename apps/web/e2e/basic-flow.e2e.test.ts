import { test, expect } from "@playwright/test";

test.describe("Basic User Flow (Real API)", () => {
  test("should load the login page and show generated username", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for the page to load and username to be generated
    await page.waitForTimeout(3000);

    // Check that the page loaded
    await expect(page.locator("body")).toBeVisible();

    // Check for the main heading
    await expect(
      page.getByRole("heading", { name: /Welcome to APStat Park/ }),
    ).toBeVisible();

    // Check that a username was generated (should be some random username)
    const continueButtons = await page
      .locator('button:has-text("Continue as")')
      .count();
    expect(continueButtons).toBeGreaterThan(0);

    // Get the generated username from the button text
    const firstContinueButton = page
      .locator('button:has-text("Continue as")')
      .first();
    const buttonText = await firstContinueButton.textContent();
    console.log("Generated username button:", buttonText);

    // Verify the button is clickable
    await expect(firstContinueButton).toBeEnabled();
  });

  test("should allow login with generated username and navigate to dashboard", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for username generation
    await page.waitForTimeout(3000);

    // Click the continue button with generated username
    const continueButton = page
      .locator('button:has-text("Continue as")')
      .first();
    await continueButton.click();

    // Should navigate to dashboard
    await expect(page).toHaveURL("/dashboard");

    // Check for dashboard content
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
    await expect(
      page.getByText("Your journey to mastering AP Statistics starts here."),
    ).toBeVisible();

    // Check for leaderboard link
    await expect(
      page.getByRole("link", { name: "🏆 Leaderboard" }),
    ).toBeVisible();
  });

  test("should navigate from dashboard to leaderboard and back", async ({
    page,
  }) => {
    // Complete login flow
    await page.goto("/");
    await page.waitForTimeout(3000);

    const continueButton = page
      .locator('button:has-text("Continue as")')
      .first();
    await continueButton.click();

    // Should be on dashboard
    await expect(page).toHaveURL("/dashboard");

    // Navigate to leaderboard
    await page.getByRole("link", { name: "🏆 Leaderboard" }).click();
    await expect(page).toHaveURL("/leaderboard");

    // Check leaderboard content
    await expect(
      page.getByRole("heading", { name: "🏆 Leaderboard" }),
    ).toBeVisible();

    // Navigate back to dashboard
    await page.getByRole("link", { name: "← Back to Dashboard" }).click();
    await expect(page).toHaveURL("/dashboard");

    // Verify we're back on dashboard
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  });

  test("should handle custom username input", async ({ page }) => {
    // Navigate to the app
    await page.goto("/");
    await page.waitForTimeout(3000);

    // Enter custom username first (this will enable the button)
    const customUsername = "E2E-TestUser-" + Date.now();
    await page
      .getByPlaceholder("Enter your preferred username")
      .fill(customUsername);

    // Now the "Continue with Custom Name" button should be enabled
    const customButton = page.getByRole("button", {
      name: /Continue with Custom Name/,
    });
    await expect(customButton).toBeEnabled();

    // Click the button
    await customButton.click();

    // Should navigate to dashboard
    await expect(page).toHaveURL("/dashboard");

    // Check that the custom username appears in the welcome message
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome, ${customUsername}`),
      }),
    ).toBeVisible();
  });
});
