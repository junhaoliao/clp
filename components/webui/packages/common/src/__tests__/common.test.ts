import {
    describe,
    expect,
    it,
} from "vitest";


describe("@webui/common", () => {
    it("should export TypeBox schemas", async () => {
        const schemas = await import("../dashboard/schemas.js");
        expect(schemas.CreateDashboardSchema).toBeDefined();
        expect(schemas.UpdateDashboardSchema).toBeDefined();
        expect(schemas.DashboardSummarySchema).toBeDefined();
    });

    it("should export dashboard types module", async () => {
        const types = await import("../dashboard/types.js");
        expect(types).toBeDefined();
    });
});
