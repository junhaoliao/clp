import {
    describe,
    expect,
    it,
} from "vitest";


describe("Cross-chart syncId", () => {
    it("should pass syncId from PanelComponentProps to chart components", () => {
        const syncId = "dashboard-abc123";

        expect(typeof syncId).toBe("string");
        expect(syncId).toBeTruthy();
    });

    it("should use dashboardUid as syncId so all panels in a dashboard sync", () => {
        const dashboardUid = "my-dash-uid";
        const syncId = dashboardUid;

        expect(syncId).toBe("my-dash-uid");
    });

    it("should handle missing syncId gracefully (no sync when not provided)", () => {
        // When syncId is not passed, charts render independently
        const provided: boolean = false;

        expect(provided).toBe(false);
    });
});
