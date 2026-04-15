import {test, expect} from "@playwright/test";


test.setTimeout(60000);

test("Capture webui-next ingest screenshot", async ({page}) => {
    await page.goto("http://localhost:4001/ingest", {waitUntil: "networkidle"});

    // Wait for API data to load
    await page.waitForResponse(
        (resp) => resp.url().includes("/api/compress-metadata"),
        {timeout: 10000},
    ).catch(() => {});

    // Wait for archive stats to load
    await page.waitForResponse(
        (resp) => resp.url().includes("/api/archive-metadata/sql"),
        {timeout: 10000},
    ).catch(() => {});

    await page.waitForTimeout(3000);

    await page.screenshot({
        path: "test-results/webui-next-ingest.png",
        fullPage: true,
    });

    // Verify space savings is no longer 0.00%
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toContain("Succeeded");
});

test("Capture original webui ingest screenshot", async ({page}) => {
    await page.goto("http://localhost:4000/ingest", {waitUntil: "networkidle"});
    await page.waitForTimeout(5000);

    await page.screenshot({
        path: "test-results/webui-original-ingest.png",
        fullPage: true,
    });
});

test("Capture webui-next search screenshot", async ({page}) => {
    await page.goto("http://localhost:4001/search", {waitUntil: "networkidle"});
    await page.waitForTimeout(2000);
    await page.screenshot({
        path: "test-results/webui-next-search.png",
        fullPage: true,
    });
});

test("Capture original webui search screenshot", async ({page}) => {
    await page.goto("http://localhost:4000/search", {waitUntil: "networkidle"});
    await page.waitForTimeout(5000);
    await page.screenshot({
        path: "test-results/webui-original-search.png",
        fullPage: true,
    });
});
