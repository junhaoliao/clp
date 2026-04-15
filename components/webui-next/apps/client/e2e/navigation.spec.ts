import {test, expect} from "@playwright/test";


test.describe("Navigation", () => {
    test("redirects / to /ingest", async ({page}) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/ingest/);
    });

    test("navigates between Ingest and Search pages", async ({page}) => {
        await page.goto("/ingest");

        // Should be on Ingest page
        await expect(page.getByText("Space Savings")).toBeVisible();

        // Click Search in sidebar
        await page.getByRole("link", {name: /search/i}).click();
        await expect(page).toHaveURL(/\/search/);

        // Should see search controls
        await expect(page.getByPlaceholder("Enter your query")).toBeVisible();

        // Navigate back to Ingest
        await page.getByRole("link", {name: /ingest/i}).click();
        await expect(page).toHaveURL(/\/ingest/);
    });

    test("sidebar collapses and expands", async ({page}) => {
        await page.goto("/ingest");

        // Find the collapse toggle button (aria-label="Toggle sidebar")
        const toggleBtn = page.getByRole("button", {name: /toggle sidebar/i});
        await expect(toggleBtn).toBeVisible();
        await toggleBtn.click();

        // After collapse, nav labels should be hidden
        await expect(page.getByRole("link", {name: "Ingest"})).not.toBeVisible();

        // Click again to expand
        await toggleBtn.click();
        await expect(page.getByRole("link", {name: "Ingest"})).toBeVisible();
    });
});
