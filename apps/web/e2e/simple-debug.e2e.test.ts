import { test, expect } from "@playwright/test";

test.describe("Simple Debug Tests", () => {
  test("should debug app loading with and without MSW", async ({ page }) => {
    // Capture console messages and errors
    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    console.log("=== Testing app without MSW ===");

    // Test without MSW first
    await page.goto("/");
    await page.waitForTimeout(3000);

    console.log("URL:", page.url());
    console.log("Title:", await page.title());

    const bodyWithoutMSW = await page.locator("body").textContent();
    console.log("Body text length:", bodyWithoutMSW?.length || 0);
    console.log("Has content:", (bodyWithoutMSW?.length || 0) > 100);

    if (bodyWithoutMSW && bodyWithoutMSW.length > 0) {
      console.log("First 200 chars:", bodyWithoutMSW.substring(0, 200));
    }

    console.log("Console messages (without MSW):", consoleMessages.length);
    console.log("Page errors (without MSW):", pageErrors.length);

    if (pageErrors.length > 0) {
      console.log("Errors:", pageErrors);
    }

    // Clear arrays for next test
    consoleMessages.length = 0;
    pageErrors.length = 0;

    console.log("=== Testing app with MSW ===");

    // Test with MSW
    await page.goto("/?msw=true");
    await page.waitForTimeout(5000); // Give more time for MSW to start

    console.log("URL:", page.url());
    console.log("Title:", await page.title());

    const bodyWithMSW = await page.locator("body").textContent();
    console.log("Body text length:", bodyWithMSW?.length || 0);
    console.log("Has content:", (bodyWithMSW?.length || 0) > 100);

    if (bodyWithMSW && bodyWithMSW.length > 0) {
      console.log("First 200 chars:", bodyWithMSW.substring(0, 200));
    }

    console.log("Console messages (with MSW):", consoleMessages.length);
    console.log("Page errors (with MSW):", pageErrors.length);

    if (pageErrors.length > 0) {
      console.log("Errors:", pageErrors);
    }

    // Look for MSW-specific console messages
    const mswMessages = consoleMessages.filter(
      (msg) =>
        msg.toLowerCase().includes("msw") ||
        msg.toLowerCase().includes("worker") ||
        msg.toLowerCase().includes("service"),
    );

    console.log("MSW-related messages:", mswMessages);

    // Check if the app loaded at all
    const appLoaded = (bodyWithMSW?.length || 0) > 100;
    console.log("App loaded successfully:", appLoaded);

    // Basic assertion that the app loads
    await expect(page.locator("body")).toBeVisible();
  });
});
