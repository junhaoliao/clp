import {defineConfig} from "@playwright/test";


export default defineConfig({
    projects: [
        {
            name: "chromium",
            use: {
                browserName: "chromium",
            },
        },
    ],
    testDir: ".",
    testMatch: "clpp-validation.spec.ts",
    timeout: 30_000,
    use: {
        baseURL: "http://localhost:8080",
    },
});
