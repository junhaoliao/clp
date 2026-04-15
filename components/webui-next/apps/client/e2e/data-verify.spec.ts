import {test, expect} from "@playwright/test";


test.describe("webui-next data verification on port 4001", () => {
    test.use({baseURL: "http://localhost:4001"});

    test("Ingest page loads compression jobs data", async ({page}) => {
        const consoleMessages: string[] = [];
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.push(msg.text());
            }
            consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        });

        await page.goto("/ingest", {waitUntil: "networkidle"});

        // Wait for API response
        await page.waitForResponse(
            (resp) => resp.url().includes("/api/compress-metadata"),
            {timeout: 10000},
        ).catch(() => {
            // May not have fired
        });

        // Wait a moment for React to render
        await page.waitForTimeout(2000);

        // Check if "Succeeded" text appears (from the job data)
        const bodyText = await page.locator("body").textContent();
        console.log("Body text length:", bodyText?.length);

        // Check for compression job status badges
        const succeededCount = await page.getByText("Succeeded").count();
        console.log("Succeeded badges:", succeededCount);

        // Check for job ID
        const jobIdCount = await page.locator("td").count();
        console.log("Table cells:", jobIdCount);

        // Log any errors
        if (consoleErrors.length > 0) {
            console.log("Console errors:", consoleErrors);
        }

        // Take screenshot for debugging
        await page.screenshot({path: "test-results/ingest-data-check.png", fullPage: true});
    });

    test("API compress-metadata returns data", async ({request}) => {
        const resp = await request.get("http://localhost:4001/api/compress-metadata");
        expect(resp.status()).toBe(200);
        const data = await resp.json();
        console.log("Compression jobs count:", data.length);
        expect(data.length).toBeGreaterThan(0);
    });
});
