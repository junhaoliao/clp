import {
    describe,
    expect,
    it,
} from "vitest";
import {useDashboardLayoutStore} from "../layout-store";
import type {Dashboard} from "@webui/common/dashboard/types";

const MOCK_DASHBOARD: Dashboard = {
    createdAt: "",
    id: "d1",
    panels: [],
    tags: [],
    timeRange: {from: "now-6h", to: "now"},
    title: "Test",
    uid: "test",
    updatedAt: "",
    variables: [],
    version: 1,
};

describe("dashboard tab actions", () => {
    it("should add a tab to the dashboard", () => {
        const store = useDashboardLayoutStore.getState();
        store.setDashboard({...MOCK_DASHBOARD});
        store.addTab("Tab 1");

        const updated = useDashboardLayoutStore.getState();
        expect(updated.dashboard?.tabs).toHaveLength(1);
        expect(updated.dashboard?.tabs?.[0]?.title).toBe("Tab 1");
        expect(updated.activeTabId).toBe(updated.dashboard?.tabs?.[0]?.id);
        expect(updated.isDirty).toBe(true);
    });

    it("should remove a tab and its panels", () => {
        const store = useDashboardLayoutStore.getState();
        store.setDashboard({
            ...MOCK_DASHBOARD,
            panels: [{id: "p1", tabId: "t1", type: "stat", title: "P1", gridPos: {x: 0, y: 0, w: 3, h: 2}, datasource: {type: "mysql", uid: "default"}, queries: [], options: {}}],
            tabs: [{id: "t1", order: 1, title: "Tab 1"}],
        });
        store.setActiveTabId("t1");

        store.removeTab("t1");

        const updated = useDashboardLayoutStore.getState();
        expect(updated.dashboard?.tabs).toHaveLength(0);
        expect(updated.dashboard?.panels).toHaveLength(0);
        expect(updated.activeTabId).toBeNull();
    });

    it("should switch active tab", () => {
        const store = useDashboardLayoutStore.getState();
        store.setDashboard({
            ...MOCK_DASHBOARD,
            tabs: [{id: "t1", order: 1, title: "Tab 1"}, {id: "t2", order: 2, title: "Tab 2"}],
        });

        store.setActiveTabId("t2");

        expect(useDashboardLayoutStore.getState().activeTabId).toBe("t2");
    });

    it("should auto-select first tab on dashboard load", () => {
        const store = useDashboardLayoutStore.getState();
        store.setDashboard({
            ...MOCK_DASHBOARD,
            tabs: [{id: "t1", order: 1, title: "Tab 1"}, {id: "t2", order: 2, title: "Tab 2"}],
        });

        expect(useDashboardLayoutStore.getState().activeTabId).toBe("t1");
    });
});
