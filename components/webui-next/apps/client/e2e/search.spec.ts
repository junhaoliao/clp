import {test, expect} from "@playwright/test";


test.describe("Search Page", () => {
    test.beforeEach(async ({page}) => {
        await page.goto("/search");
    });

    test("displays search controls", async ({page}) => {
        await expect(page.getByPlaceholder("Enter your query")).toBeVisible();
        await expect(page.getByRole("button", {name: /search/i}).first()).toBeVisible();
    });

    test("displays time range selector", async ({page}) => {
        // Time range uses two text inputs (First timestamp / Last timestamp)
        const firstTs = page.getByPlaceholder("First timestamp");
        const lastTs = page.getByPlaceholder("Last timestamp");
        await expect(firstTs).toBeVisible();
        await expect(lastTs).toBeVisible();
    });

    test("has case sensitivity toggle", async ({page}) => {
        const toggle = page.getByRole("button", {name: "aa"});
        await expect(toggle).toBeVisible();
    });

    test("search button is disabled when query is empty", async ({page}) => {
        const searchBtn = page.getByRole("button", {name: /search/i}).first();
        await expect(searchBtn).toBeDisabled();
    });

    test("can type a query and enable search button", async ({page}) => {
        const input = page.getByPlaceholder("Enter your query");
        await input.fill("error");

        const searchBtn = page.getByRole("button", {name: /search/i}).first();
        await expect(searchBtn).toBeEnabled();
    });

    test("displays timeline and results placeholders", async ({page}) => {
        // DashboardCard titles rendered by shadcn CardTitle
        await expect(page.getByText("Results Timeline")).toBeVisible({timeout: 10000});
        await expect(page.getByText("Search Results")).toBeVisible();
    });

    test("toggles case sensitivity on click", async ({page}) => {
        const toggle = page.getByRole("button", {name: "aa"});
        await toggle.click();

        // After click, should show "Aa" (case-sensitive mode)
        await expect(page.getByRole("button", {name: "Aa"})).toBeVisible();
    });

    test("displays dataset selector when using CLP-S", async ({page}) => {
        // In CLP-S mode, there's a dataset dropdown showing "All" by default
        const datasetBtn = page.getByRole("button", {name: "All"});
        await expect(datasetBtn).toBeVisible();
    });

    test("search button changes to Cancel during query", async ({page}) => {
        const input = page.getByPlaceholder("Enter your query");
        await input.fill("test query");

        const searchBtn = page.getByRole("button", {name: /search/i}).first();
        await searchBtn.click();

        // Should now show "Cancel" button instead of "Search"
        await expect(page.getByRole("button", {name: /cancel/i})).toBeVisible({
            timeout: 5000,
        });
    });

    test("displays placeholder messages when no results", async ({page}) => {
        await expect(page.getByText("No timeline data available.")).toBeVisible();
        await expect(page.getByText("No results available.")).toBeVisible();
    });
});
