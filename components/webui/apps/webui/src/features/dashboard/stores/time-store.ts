import {create} from "zustand";

import {ONE_HOUR_MS} from "../components/time-range-picker-constants";

import {toLocal} from "@/lib/utils";


const DEFAULT_RANGE_HOURS = 6;
const DEFAULT_RANGE_MS = DEFAULT_RANGE_HOURS * ONE_HOUR_MS;


/**
 *
 */
const defaultRange = () => {
    const now = new Date();

    return {
        from: toLocal(new Date(now.getTime() - DEFAULT_RANGE_MS)),
        to: toLocal(now),
    };
};

interface DashboardTimeState {
    activePreset: string | null;
    liveTail: boolean;
    refreshInterval: string | null;
    timeRange: {from: string; to: string};
    setActivePreset: (preset: string | null) => void;
    setLiveTail: (v: boolean) => void;
    setRefreshInterval: (interval: string | null) => void;
    setTimeRange: (from: string, to: string) => void;
}

export const useDashboardTimeStore = create<DashboardTimeState>()((set) => ({
    activePreset: "24h",
    liveTail: true,
    refreshInterval: null,
    setActivePreset: (preset) => {
        set({activePreset: preset});
    },
    setLiveTail: (v) => {
        set({liveTail: v});
    },
    setRefreshInterval: (interval) => {
        set({refreshInterval: interval});
    },
    setTimeRange: (from, to) => {
        set({timeRange: {from, to}});
    },
    timeRange: defaultRange(),
}));
