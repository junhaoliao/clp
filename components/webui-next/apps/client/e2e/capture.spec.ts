import {test} from "@playwright/test";


test("Capture full screenshot with data", async ({page}) => {
    await page.goto("http://localhost:4001/ingest", {waitUntil: "networkidle"});

    // Wait for API data to load (may have already fired)
    await page.waitForResponse(
        (resp) => resp.url().includes("/api/compress-metadata"),
        {timeout: 10000},
    ).catch(() => {});

    // Wait for React to render the data
    await page.waitForTimeout(2000);

    await page.screenshot({
        path: "test-results/ingest-with-data.png",
        fullPage: true,
    });
});
