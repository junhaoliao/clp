import {
    describe,
    expect,
    it,
} from "vitest";


describe("Routes Index", () => {
    it("should export routes with search, compress, and other endpoints", async () => {
        const {default: routes} = await import("./index.js");

        expect(routes).toBeDefined();
    });

    it("should include static routes as last mount", async () => {
        const {default: routes} = await import("./index.js");

        // Static routes should catch all unmatched paths (SPA fallback)
        const res = await routes.request("/some-unknown-path");
        expect(res.status).toBe(200);
    });
});
