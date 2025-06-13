import { worker } from "./browser";

// Global flag to track if MSW is enabled
let mswEnabled = false;

export async function setupMSW() {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("msw") === "true" && !mswEnabled) {
    try {
      console.log("MSW: Starting service worker...");
      await worker.start({
        onUnhandledRequest: "bypass",
      });
      mswEnabled = true;
      console.log("MSW: Service worker started successfully");
      return true;
    } catch (error) {
      console.error("MSW: Failed to start service worker:", error);
      return false;
    }
  }
  return mswEnabled;
}
