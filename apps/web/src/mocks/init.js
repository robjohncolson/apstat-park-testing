import { worker } from "./browser";
export async function startMSW() {
    try {
        console.log("MSW: Starting service worker...");
        await worker.start({
            onUnhandledRequest: "bypass",
        });
        console.log("MSW: Service worker started successfully");
        return true;
    }
    catch (error) {
        console.error("MSW: Failed to start service worker:", error);
        return false;
    }
}
