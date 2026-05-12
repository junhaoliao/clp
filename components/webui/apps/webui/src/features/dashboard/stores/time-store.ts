import {create} from "zustand";

interface DashboardTimeState {
  timeRange: {from: string; to: string};
  refreshInterval: string | null;
  timezone: string;
  setTimeRange: (from: string, to: string) => void;
  setRefreshInterval: (interval: string | null) => void;
  setTimezone: (tz: string) => void;
}

export const useDashboardTimeStore = create<DashboardTimeState>()((set) => ({
  timeRange: {from: "now-6h", to: "now"},
  refreshInterval: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  setTimeRange: (from, to) => set({timeRange: {from, to}}),
  setRefreshInterval: (interval) => set({refreshInterval: interval}),
  setTimezone: (tz) => set({timezone: tz}),
}));
