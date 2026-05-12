import type {Dashboard} from "@webui/common/dashboard/types";
import {create} from "zustand";


interface DashboardListState {
    dashboards: Dashboard[];
    isLoading: boolean;
    searchQuery: string;
    fetchDashboards: () => Promise<void>;
    deleteDashboard: (uid: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
}

export const useDashboardListStore = create<DashboardListState>()((set, get) => ({
    dashboards: [],
    isLoading: false,
    searchQuery: "",

    fetchDashboards: async () => {
        set({isLoading: true});
        try {
            const res = await fetch("/api/dashboards");
            if (!res.ok) {
                throw new Error(`Failed to fetch dashboards: ${res.status}`);
            }
            const data = await res.json() as Dashboard[];
            set({dashboards: data, isLoading: false});
        } catch {
            set({isLoading: false});
        }
    },

    deleteDashboard: async (uid: string) => {
        const res = await fetch(`/api/dashboards/${uid}`, {method: "DELETE"});
        if (!res.ok) {
            throw new Error(`Failed to delete dashboard: ${res.status}`);
        }
        set({dashboards: get().dashboards.filter((d) => d.uid !== uid)});
    },

    setSearchQuery: (query: string) => {
        set({searchQuery: query});
    },
}));
