import { test, expect, Page } from "@playwright/test";

/**
 * Breakpoints we want to validate. These roughly map to common device sizes.
 */
const viewports = [
  { width: 375, height: 667, label: "mobile" }, // iPhone 8 portrait
  { width: 768, height: 1024, label: "tablet" }, // iPad portrait
  { width: 1280, height: 800, label: "desktop" }, // Laptop
] as const;

/**
 * Pages whose layouts we care about. The MSW query-param ensures the mocked
 * API handlers are active, so we can run the app entirely client-side.
 */
const pages = [
  { path: "/?msw=true", name: "login", requiresAuth: false },
  { path: "/dashboard?msw=true", name: "dashboard", requiresAuth: true },
  {
    path: "/unit/unit1/lesson/1-1?msw=true",
    name: "lesson",
    requiresAuth: true,
  },
] as const;

// Re-usable mock user object for pages that require authentication.
const mockUser = {
  id: 999,
  username: "viewport-tester",
  created_at: new Date().toISOString(),
  last_sync: new Date().toISOString(),
};

/**
 * Utility that injects the mock user into localStorage *before* the page loads
 * to bypass the login flow.
 */
async function primeLocalStorage(page: Page) {
  await page.addInitScript((userString) => {
    window.localStorage.setItem("apstat-user", userString as string);
  }, JSON.stringify(mockUser));
}

test.describe("Responsive layout – no horizontal scroll", () => {
  for (const vp of viewports) {
    test.describe(`${vp.label} viewport (${vp.width}×${vp.height})`, () => {
      for (const pg of pages) {
        test(`${pg.name} page fits within viewport`, async ({ page }) => {
          // Auth-only pages need the user primed *before* navigation.
          if (pg.requiresAuth) {
            await primeLocalStorage(page);
          }

          // Set viewport *before* navigation to ensure CSS media queries apply
          // immediately during initial render.
          await page.setViewportSize({ width: vp.width, height: vp.height });

          await page.goto(pg.path);

          // Give the page a moment to settle (fonts/images etc.) – a small
          // delay is usually sufficient when running against the mocked API.
          await page.waitForLoadState("networkidle");

          // Assert there is no horizontal overflow. A 1-pixel leeway avoids
          // false-positives due to sub-pixel rounding.
          const hasHorizontalOverflow = await page.evaluate(() => {
            return (
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth + 1
            );
          });

          expect(
            hasHorizontalOverflow,
            `Page ${pg.name} overflowed at ${vp.label} viewport`,
          ).toBeFalsy();
        });
      }
    });
  }
}); 