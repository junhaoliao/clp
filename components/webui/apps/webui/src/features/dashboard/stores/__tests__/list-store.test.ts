import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {useDashboardListStore} from "../list-store";


describe("DashboardListStore", () => {
    beforeEach(() => {
        useDashboardListStore.setState({
            dashboards: [],
            isLoading: false,
            searchQuery: "",
        });
    });

    it("should start with empty state", () => {
        const state = useDashboardListStore.getState();
        expect(state.dashboards).toEqual([]);
        expect(state.isLoading).toBe(false);
        expect(state.searchQuery).toBe("");
    });

    it("should set search query", () => {
        useDashboardListStore.getState().setSearchQuery("test");
        expect(useDashboardListStore.getState().searchQuery).toBe("test");
    });

    it("should fetch dashboards from API", async () => {
        const mockDashboards = [
            {uid: "abc", title: "Dashboard 1", tags: [], version: 1, panels: [], variables: [], timeRange: {from: "now-6h", to: "now"}, updatedAt: "2025-01-01", createdAt: "2025-01-01", id: "1"},
        ];

        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async () => mockDashboards,
        } as Response);

        await useDashboardListStore.getState().fetchDashboards();

        expect(useDashboardListStore.getState().dashboards).toEqual(mockDashboards);
        expect(useDashboardListStore.getState().isLoading).toBe(false);
        vi.restoreAllMocks();
    });

    it("should handle fetch errors", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: false,
            status: 500,
        } as Response);

        await useDashboardListStore.getState().fetchDashboards();

        expect(useDashboardListStore.getState().dashboards).toEqual([]);
        expect(useDashboardListStore.getState().isLoading).toBe(false);
        vi.restoreAllMocks();
    });

    it("should delete dashboard from local state", async () => {
        useDashboardListStore.setState({
            dashboards: [
                {uid: "a", title: "A", id: "1", tags: [], version: 1, panels: [], variables: [], timeRange: {from: "now-6h", to: "now"}, updatedAt: "", createdAt: ""},
                {uid: "b", title: "B", id: "2", tags: [], version: 1, panels: [], variables: [], timeRange: {from: "now-6h", to: "now"}, updatedAt: "", createdAt: ""},
            ],
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
        } as Response);

        await useDashboardListStore.getState().deleteDashboard("a");

        expect(useDashboardListStore.getState().dashboards).toHaveLength(1);
        expect(useDashboardListStore.getState().dashboards[0]!.uid).toBe("b");
        vi.restoreAllMocks();
    });
});
