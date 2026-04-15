import {test, expect} from "@playwright/test";


test.describe("webui-next smoke test on port 4001", () => {
    test.use({baseURL: "http://localhost:4001"});

    test("Ingest page shows compression jobs from real data", async ({page}) => {
        await page.goto("/ingest", {waitUntil: "networkidle"});

        // Dashboard cards
        await expect(page.getByText("Space Savings")).toBeVisible({timeout: 10000});
        await expect(page.getByText("Uncompressed")).toBeVisible();
        await expect(page.getByText("Compressed", {exact: true})).toBeVisible();

        // Compress form
        await expect(page.getByText("Compress").first()).toBeVisible();
        await expect(page.getByRole("button", {name: /submit/i}).first()).toBeVisible();

        // Compression Jobs table
        await expect(page.getByText("Compression Jobs")).toBeVisible();

        // There should be a completed job from previous compression
        await expect(page.getByText("Succeeded")).toBeVisible({timeout: 5000});
    });

    test("Search page shows controls and can type query", async ({page}) => {
        await page.goto("/search", {waitUntil: "networkidle"});

        // Search controls
        await expect(page.getByPlaceholder("Enter your query")).toBeVisible({timeout: 10000});
        await expect(page.getByText("Results Timeline")).toBeVisible();
        await expect(page.getByText("Search Results")).toBeVisible();

        // Search button disabled when empty
        const searchBtn = page.getByRole("button", {name: /search/i}).first();
        await expect(searchBtn).toBeDisabled();

        // Type a query
        await page.getByPlaceholder("Enter your query").fill("error");
        await expect(searchBtn).toBeEnabled();
    });

    test("Navigation between pages works", async ({page}) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/ingest/);

        // Go to search
        await page.getByRole("link", {name: /search/i}).first().click();
        await expect(page).toHaveURL(/\/search/);

        // Go back to ingest
        await page.getByRole("link", {name: /ingest/i}).first().click();
        await expect(page).toHaveURL(/\/ingest/);
    });
});
