import {describe, it, expect, beforeEach} from "vitest";
import {useDashboardTimeStore} from "../time-store";

describe("DashboardTimeStore", () => {
  beforeEach(() => {
    useDashboardTimeStore.setState({timeRange: {from: "now-6h", to: "now"}, refreshInterval: null});
  });

  it("should have default time range", () => {
    const state = useDashboardTimeStore.getState();
    expect(state.timeRange.from).toBe("now-6h");
    expect(state.timeRange.to).toBe("now");
  });

  it("should set time range", () => {
    useDashboardTimeStore.getState().setTimeRange("now-24h", "now");
    const state = useDashboardTimeStore.getState();
    expect(state.timeRange.from).toBe("now-24h");
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
