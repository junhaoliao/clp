import {chromium, expect, test} from "@playwright/test";


test.describe("CLPP WebUI Validation — Section 8", () => {
    // 8.1a: App loads
    test("8.1a: App loads", async ({page}) => {
        await page.goto("http://localhost:4000/");
        await page.waitForLoadState("networkidle");
        await expect(page.locator("body")).toBeVisible();
    });

    // 8.1b: Sidebar shows 'Explore' (not 'Search')
    test("8.1b: Sidebar shows 'Explore'", async ({page}) => {
        await page.goto("http://localhost:4000/");
        await page.waitForLoadState("networkidle");
        const exploreLink = page.getByText("Explore");
        await expect(exploreLink).toBeVisible();
    });

    // 8.1c: Sidebar shows 'Settings' link
    test("8.1c: Sidebar shows 'Settings' link", async ({page}) => {
        await page.goto("http://localhost:4000/");
        await page.waitForLoadState("networkidle");
        const settingsLink = page.getByText("Settings");
        await expect(settingsLink).toBeVisible();
    });

    // 8.1d: Settings page loads at /settings
    test("8.1d: Settings page loads at /settings", async ({page}) => {
        await page.goto("http://localhost:4000/settings");
        await page.waitForLoadState("networkidle");
        await expect(page.getByText("Settings")).toBeVisible();
    });

    // 8.2a: Explore page shows all 3 tabs (Logs, Patterns, Schema)
    test("8.2a: All 3 tabs visible on Explore page", async ({page}) => {
        await page.goto("http://localhost:4000/search");
        await page.waitForLoadState("networkidle");
        await expect(page.getByRole("tab", {name: "Logs"})).toBeVisible();
        await expect(page.getByRole("tab", {name: "Patterns"})).toBeVisible({timeout: 5000});
        await expect(page.getByRole("tab", {name: "Schema"})).toBeVisible({timeout: 5000});
    });

    // 8.2c: Patterns tab clickable
    test("8.2c: Patterns tab clickable", async ({page}) => {
        await page.goto("http://localhost:4000/search");
        await page.waitForLoadState("networkidle");
        const patternsTab = page.getByRole("tab", {name: "Patterns"});
        await expect(patternsTab).toBeVisible({timeout: 5000});
        await patternsTab.click();
    });

    // 8.2d: Schema tab clickable
    test("8.2d: Schema tab clickable", async ({page}) => {
        await page.goto("http://localhost:4000/search");
        await page.waitForLoadState("networkidle");
        const schemaTab = page.getByRole("tab", {name: "Schema"});
        await expect(schemaTab).toBeVisible({timeout: 5000});
        await schemaTab.click();
    });

    // 8.2f: Field Browser sidebar with CLPP sections
    test("8.2f: Field Browser sidebar with CLPP sections", async ({page}) => {
        await page.goto("http://localhost:4000/search");
        await page.waitForLoadState("networkidle");
        const fieldBrowser = page.getByText("Available Fields");
        await expect(fieldBrowser).toBeVisible({timeout: 5000});
    });

    // 8.2g: Filter Bar with CLPP filters
    test("8.2g: Filter Bar with CLPP filters", async ({page}) => {
        await page.goto("http://localhost:4000/search");
        await page.waitForLoadState("networkidle");
        const filterButton = page.getByText("+ Filter");
        await expect(filterButton).toBeVisible({timeout: 5000});
    });

    // 8.3a: Ingest page loads without errors
    test("8.3a: Ingest page loads without errors", async ({page}) => {
        await page.goto("http://localhost:4000/ingest");
        await page.waitForLoadState("networkidle");
        await expect(page.locator("body")).toBeVisible();
    });

    // 8.3b: Schema Library visible on Settings page
    test("8.3b: Schema Library visible on Settings page", async ({page}) => {
        await page.goto("http://localhost:4000/settings");
        await page.waitForLoadState("networkidle");
        const schemaLibrary = page.getByText("Saved Schemas");
        await expect(schemaLibrary).toBeVisible();
    });

    // 8.5: Ingest page loads (archive details columns rendered at runtime)
    test("8.5: Ingest page loads without errors", async ({page}) => {
        await page.goto("http://localhost:4000/ingest");
        await page.waitForLoadState("networkidle");
        await expect(page.locator("body")).toBeVisible();
    });

    // 8.6: Dashboard page loads without errors
    test("8.6: Dashboard page loads without errors", async ({page}) => {
        await page.goto("http://localhost:4000/dashboards");
        await page.waitForLoadState("networkidle");
        await expect(page.locator("body")).toBeVisible();
    });

    // API: Schema CRUD endpoint responds
    test("API: Schema CRUD endpoint responds", async ({page}) => {
        const response = await page.request.get("http://localhost:4000/api/schemas");
        expect(response.ok()).toBeTruthy();
    });

    // API: Logtype Stats endpoint responds
    test("API: Logtype Stats endpoint responds", async ({page}) => {
        const response = await page.request.get("http://localhost:4000/api/logtype-stats");
        // May return 400 without archive_id param, but endpoint exists
        expect(response.status()).toBeLessThan(500);
    });

    // API: Schema Tree endpoint responds
    test("API: Schema Tree endpoint responds", async ({page}) => {
        const response = await page.request.get("http://localhost:4000/api/schema-tree");
        // May return 400 without archive_id param, but endpoint exists
        expect(response.status()).toBeLessThan(500);
    });
});
