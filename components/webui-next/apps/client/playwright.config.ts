import {defineConfig, devices} from "@playwright/test";


const VITE_PORT = process.env.VITE_PORT ?? "4001";

/**
 * Playwright E2E test configuration.
 *
 * Tests run against the dev server (Vite proxying to Hono API server).
 * For CI or full-stack testing, start both servers first.
 */
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "html",
    use: {
        baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${VITE_PORT}`,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: {...devices["Desktop Chrome"]},
        },
    ],
    webServer: {
        command: `SERVER_PORT=${process.env.SERVER_PORT ?? "3002"} VITE_PORT=${VITE_PORT} pnpm dev`,
        url: `http://localhost:${VITE_PORT}`,
        reuseExistingServer: !process.env.CI,
    },
});
