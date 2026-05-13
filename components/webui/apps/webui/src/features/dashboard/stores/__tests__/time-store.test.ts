import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {useDashboardTimeStore} from "../time-store";


describe("DashboardTimeStore", () => {
    beforeEach(() => {
        useDashboardTimeStore.setState({
            timeRange: {from: "2023-03-01T00:00:00", to: "2023-03-01T06:00:00"},
            liveTail: false,
            activePreset: null,
            refreshInterval: null,
        });
    });

    it("should set time range", () => {
        useDashboardTimeStore.getState().setTimeRange("2023-03-01T00:00:00", "2023-03-01T12:00:00");
        const state = useDashboardTimeStore.getState();
        expect(state.timeRange.from).toBe("2023-03-01T00:00:00");
        expect(state.timeRange.to).toBe("2023-03-01T12:00:00");
    });

    it("should set live tail", () => {
        useDashboardTimeStore.getState().setLiveTail(true);
        expect(useDashboardTimeStore.getState().liveTail).toBe(true);
        useDashboardTimeStore.getState().setLiveTail(false);
        expect(useDashboardTimeStore.getState().liveTail).toBe(false);
    });

    it("should set active preset", () => {
        useDashboardTimeStore.getState().setActivePreset("24h");
        expect(useDashboardTimeStore.getState().activePreset).toBe("24h");
        useDashboardTimeStore.getState().setActivePreset(null);
        expect(useDashboardTimeStore.getState().activePreset).toBeNull();
    });

    it("should set refresh interval", () => {
        useDashboardTimeStore.getState().setRefreshInterval("30s");
        expect(useDashboardTimeStore.getState().refreshInterval).toBe("30s");
    });

    it("should clear refresh interval", () => {
        useDashboardTimeStore.getState().setRefreshInterval("30s");
        useDashboardTimeStore.getState().setRefreshInterval(null);
        expect(useDashboardTimeStore.getState().refreshInterval).toBeNull();
    });
});
