import {test, expect} from "@playwright/test";


test.describe("Ingest Page", () => {
    test.beforeEach(async ({page}) => {
        await page.goto("/ingest");
    });

    test("displays space savings dashboard", async ({page}) => {
        await expect(page.getByText("Space Savings")).toBeVisible();
        await expect(page.getByText("Uncompressed", {exact: true})).toBeVisible();
        await expect(page.getByText("Compressed", {exact: true})).toBeVisible();
    });

    test("displays compression form (FS input type)", async ({page}) => {
        // When LogsInputType is FS, the compress form should be visible
        const compressCard = page.getByText("Submit Compression Job").first();
        await expect(compressCard).toBeVisible();

        // Should have submit button
        await expect(page.getByRole("button", {name: /submit/i}).first()).toBeVisible();
    });

    test("displays compression jobs table", async ({page}) => {
        await expect(page.getByText("Compression Jobs")).toBeVisible();
    });

    test("shows validation error when submitting empty paths", async ({page}) => {
        const submitBtn = page.getByRole("button", {name: /submit/i}).first();
        await submitBtn.click();

        // Sonner toast should appear
        await expect(page.getByText(/at least one path/i)).toBeVisible();
    });

    test("displays existing compression jobs in table", async ({page}) => {
        // Wait for the compression jobs table to load
        await expect(page.getByText("Compression Jobs")).toBeVisible();

        // Table should have headers
        await expect(page.getByRole("columnheader", {name: "Job ID"})).toBeVisible();
        await expect(page.getByRole("columnheader", {name: "Status"})).toBeVisible();
    });

    test("displays time range card", async ({page}) => {
        await expect(page.getByText("Time Range")).toBeVisible();
    });

    test("displays dataset field when using CLP-S storage engine", async ({page}) => {
        // Dataset input field is visible in CLP-S mode
        await expect(page.getByPlaceholder("The dataset for new archives")).toBeVisible();
        await expect(page.getByText("Convert to JSON")).toBeVisible();
        await expect(page.getByText("Timestamp Key")).toBeVisible();
    });
});
