import {describe, it, expect, beforeEach} from "vitest";
import {useDashboardLayoutStore} from "../layout-store";
import {initializePanelPlugins} from "../../plugins/init";
import type {Dashboard} from "@webui/common/dashboard/types";

const mockDashboard: Dashboard = {
  id: "d1",
  uid: "test-uid",
  title: "Test Dashboard",
  tags: [],
  variables: [],
  timeRange: {from: "now-6h", to: "now"},
  panels: [
    {
      id: "p1",
      type: "timeseries",
      title: "CPU",
      gridPos: {x: 0, y: 0, w: 6, h: 4},
      datasource: {type: "mysql", uid: "ds1"},
      queries: [{refId: "A", datasource: {type: "mysql", uid: "ds1"}, query: "SELECT 1"}],
      options: {},
    },
  ],
  version: 1,
  updatedAt: "2024-01-01T00:00:00Z",
  createdAt: "2024-01-01T00:00:00Z",
};

describe("DashboardLayoutStore", () => {
  beforeEach(() => {
    initializePanelPlugins();
    useDashboardLayoutStore.getState().reset();
    // Clear undo history
    useDashboardLayoutStore.temporal.getState().clear();
  });

  it("should start with null dashboard", () => {
    const state = useDashboardLayoutStore.getState();
    expect(state.dashboard).toBeNull();
    expect(state.isDirty).toBe(false);
  });

  it("should set dashboard", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    const state = useDashboardLayoutStore.getState();
    expect(state.dashboard?.uid).toBe("test-uid");
    expect(state.isDirty).toBe(false);
  });

  it("should update panel", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    useDashboardLayoutStore.getState().updatePanel("p1", {title: "Memory"});
    const state = useDashboardLayoutStore.getState();
    expect(state.dashboard?.panels[0]!.title).toBe("Memory");
    expect(state.isDirty).toBe(true);
  });

  it("should update panel grid position", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    useDashboardLayoutStore.getState().updatePanelGridPos("p1", {x: 6, y: 0, w: 6, h: 4});
    const state = useDashboardLayoutStore.getState();
    expect(state.dashboard?.panels[0]!.gridPos.x).toBe(6);
  });

  it("should add a panel", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    useDashboardLayoutStore.getState().addPanel("stat");
    const state = useDashboardLayoutStore.getState();
    expect(state.dashboard?.panels).toHaveLength(2);
    expect(state.dashboard?.panels[1]!.type).toBe("stat");
    expect(state.selectedPanelId).toBeTruthy();
  });

  it("should add markdown panel with empty queries (no query scaffold)", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    useDashboardLayoutStore.getState().addPanel("markdown");
    const state = useDashboardLayoutStore.getState();
    const mdPanel = state.dashboard?.panels.find((p) => "markdown" === p.type);
    expect(mdPanel).toBeDefined();
    expect(mdPanel!.queries).toHaveLength(0);
  });

  it("should add timeseries panel with query scaffold", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    useDashboardLayoutStore.getState().addPanel("timeseries");
    const state = useDashboardLayoutStore.getState();
    const tsPanel = state.dashboard?.panels.find((p) => "timeseries" === p.type && "p1" !== p.id);
    expect(tsPanel).toBeDefined();
    expect(tsPanel!.queries).toHaveLength(1);
    expect(tsPanel!.queries[0]!.refId).toBe("A");
  });

  it("should remove a panel", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    useDashboardLayoutStore.getState().removePanel("p1");
    const state = useDashboardLayoutStore.getState();
    expect(state.dashboard?.panels).toHaveLength(0);
  });

  it("should set editing mode", () => {
    useDashboardLayoutStore.getState().setEditing(true);
    expect(useDashboardLayoutStore.getState().isEditing).toBe(true);
  });

  it("should support undo after panel change", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    useDashboardLayoutStore.getState().updatePanel("p1", {title: "Changed"});
    expect(useDashboardLayoutStore.getState().dashboard?.panels[0]!.title).toBe("Changed");

    useDashboardLayoutStore.temporal.getState().undo();
    expect(useDashboardLayoutStore.getState().dashboard?.panels[0]!.title).toBe("CPU");
  });

  it("should support redo after undo", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    useDashboardLayoutStore.getState().updatePanel("p1", {title: "Changed"});
    useDashboardLayoutStore.temporal.getState().undo();
    useDashboardLayoutStore.temporal.getState().redo();
    expect(useDashboardLayoutStore.getState().dashboard?.panels[0]!.title).toBe("Changed");
  });

  it("should set variables", () => {
    useDashboardLayoutStore.getState().setDashboard(mockDashboard);
    const vars = [{id: "v1", name: "host", type: "custom" as const, options: [{value: "a", text: "a", selected: true}], current: {value: "a", text: "a"}}];
    useDashboardLayoutStore.getState().setVariables(vars);
    const state = useDashboardLayoutStore.getState();
    expect(state.dashboard?.variables).toHaveLength(1);
    expect(state.dashboard?.variables[0]!.name).toBe("host");
    expect(state.isDirty).toBe(true);
  });

  it("should auto-compact panels after delete", () => {
    const multiPanelDashboard: Dashboard = {
      ...mockDashboard,
      panels: [
        {id: "p1", type: "timeseries", title: "Top", gridPos: {x: 0, y: 0, w: 12, h: 2}, datasource: {type: "mysql", uid: "ds1"}, queries: [{refId: "A", datasource: {type: "mysql", uid: "ds1"}, query: "SELECT 1"}], options: {}},
        {id: "p2", type: "timeseries", title: "Middle", gridPos: {x: 0, y: 2, w: 12, h: 2}, datasource: {type: "mysql", uid: "ds1"}, queries: [{refId: "A", datasource: {type: "mysql", uid: "ds1"}, query: "SELECT 2"}], options: {}},
        {id: "p3", type: "timeseries", title: "Bottom", gridPos: {x: 0, y: 4, w: 12, h: 2}, datasource: {type: "mysql", uid: "ds1"}, queries: [{refId: "A", datasource: {type: "mysql", uid: "ds1"}, query: "SELECT 3"}], options: {}},
      ],
    };
    useDashboardLayoutStore.getState().setDashboard(multiPanelDashboard);

    // Delete the top panel — remaining panels should compact up
    useDashboardLayoutStore.getState().removePanel("p1");

    const state = useDashboardLayoutStore.getState();
    expect(state.dashboard?.panels).toHaveLength(2);
    // Middle panel should move to y=0
    const middle = state.dashboard?.panels.find((p) => p.id === "p2");
    expect(middle?.gridPos.y).toBe(0);
    // Bottom panel should move to y=2
    const bottom = state.dashboard?.panels.find((p) => p.id === "p3");
    expect(bottom?.gridPos.y).toBe(2);
  });
});
