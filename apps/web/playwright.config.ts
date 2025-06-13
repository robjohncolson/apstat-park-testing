import { defineConfig, devices } from "@playwright/test";

// Define the base URL, which points to our Vite dev server
const baseURL = "http://localhost:5173";

export default defineConfig({
  // Directory where our E2E tests will live
  testDir: "./e2e",

  // Timeout for each test in milliseconds
  timeout: 30 * 1000,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Run tests in files in parallel
  fullyParallel: true,

  // Use a web server to automatically start our dev environment before tests
  webServer: {
    // Command to start the Vite dev server for the web app
    command: "..\\..\\run.bat npm run dev --workspace=@apstat-park/web",
    // URL to wait for before starting tests
    url: baseURL,
    // Reuse the dev server if it's already running
    reuseExistingServer: !process.env.CI,
  },

  // Use the baseURL in actions like `await page.goto('/')`
  use: {
    baseURL: baseURL,
    trace: "on-first-retry",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
