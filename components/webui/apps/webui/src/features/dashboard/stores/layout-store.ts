import {create} from "zustand";
import {temporal} from "zundo";
import type {Dashboard, DashboardPanel, DashboardTab, GridPos, PanelType} from "@webui/common/dashboard/types";
import {autoCompact} from "../hooks/grid-utils";

interface DashboardLayoutState {
  dashboard: Dashboard | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  isDirty: boolean;
  selectedPanelId: string | null;
  activeTabId: string | null;

  setDashboard: (dashboard: Dashboard) => void;
  updatePanel: (panelId: string, updates: Partial<DashboardPanel>) => void;
  updatePanelGridPos: (panelId: string, gridPos: GridPos) => void;
  addPanel: (type: PanelType) => void;
  removePanel: (panelId: string) => void;
  setVariables: (variables: Dashboard["variables"]) => void;
  setEditing: (isEditing: boolean) => void;
  setSelectedPanelId: (panelId: string | null) => void;
  setActiveTabId: (tabId: string | null) => void;
  addTab: (title: string) => void;
  removeTab: (tabId: string) => void;
  reset: () => void;
}

const DEFAULT_GRID_POS: Record<string, GridPos> = {
  timeseries: {x: 0, y: 0, w: 6, h: 4},
  stat: {x: 0, y: 0, w: 3, h: 2},
  table: {x: 0, y: 0, w: 12, h: 4},
  barchart: {x: 0, y: 0, w: 6, h: 4},
  logs: {x: 0, y: 0, w: 12, h: 4},
  markdown: {x: 0, y: 0, w: 6, h: 2},
  gauge: {x: 0, y: 0, w: 3, h: 3},
  heatmap: {x: 0, y: 0, w: 6, h: 4},
  piechart: {x: 0, y: 0, w: 4, h: 4},
};

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  temporal(
    (set, get) => ({
      dashboard: null,
      isLoading: false,
      error: null,
      isEditing: false,
      isDirty: false,
      selectedPanelId: null,
      activeTabId: null,

      setDashboard: (dashboard) => set({dashboard, isLoading: false, error: null, isDirty: false, activeTabId: dashboard.tabs?.[0]?.id ?? null}),
      updatePanel: (panelId, updates) => {
        const d = get().dashboard;
        if (!d) return;
        set({
          dashboard: {
            ...d,
            panels: d.panels.map((p) => p.id === panelId ? {...p, ...updates} : p),
          },
          isDirty: true,
        });
      },
      updatePanelGridPos: (panelId, gridPos) => {
        const d = get().dashboard;
        if (!d) return;
        set({
          dashboard: {
            ...d,
            panels: d.panels.map((p) => p.id === panelId ? {...p, gridPos} : p),
          },
          isDirty: true,
        });
      },
      addPanel: (type) => {
        const d = get().dashboard;
        if (!d) return;
        const maxY = d.panels.reduce((max, p) => Math.max(max, p.gridPos.y + p.gridPos.h), 0);
        const id = `panel-${Date.now()}`;
        const dsType = "logs" === type ? "clp" : "mysql";
        const query = "clp" === dsType ?
          {queryString: "", datasets: []} :
          "";
        const newPanel: DashboardPanel = {
          id,
          type,
          title: type.charAt(0).toUpperCase() + type.slice(1),
          gridPos: {...DEFAULT_GRID_POS[type] ?? {x: 0, y: 0, w: 6, h: 4}, y: maxY},
          datasource: {type: dsType, uid: "default"},
          queries: [{refId: "A", datasource: {type: dsType, uid: "default"}, query}],
          options: {},
        };
        set({
          dashboard: {...d, panels: [...d.panels, newPanel]},
          isDirty: true,
          selectedPanelId: id,
        });
      },
      removePanel: (panelId) => {
        const d = get().dashboard;
        if (!d) return;
        const remaining = d.panels.filter((p) => p.id !== panelId);
        const compacted = autoCompact(remaining);
        set({
          dashboard: {...d, panels: compacted},
          isDirty: true,
          selectedPanelId: get().selectedPanelId === panelId ? null : get().selectedPanelId,
        });
      },
      setVariables: (variables) => {
        const d = get().dashboard;
        if (!d) return;
        set({
          dashboard: {...d, variables},
          isDirty: true,
        });
      },
      setEditing: (isEditing) => set({isEditing}),
      setSelectedPanelId: (panelId) => set({selectedPanelId: panelId}),
      setActiveTabId: (tabId) => set({activeTabId: tabId}),
      addTab: (title) => {
        const d = get().dashboard;
        if (!d) {
            return;
        }
        const id = `tab-${Date.now()}`;
        const tabs = [...(d.tabs ?? []), {id, order: (d.tabs?.length ?? 0) + 1, title}] as DashboardTab[];
        set({dashboard: {...d, tabs}, isDirty: true, activeTabId: id});
      },
      removeTab: (tabId) => {
        const d = get().dashboard;
        if (!d) {
            return;
        }
        const tabs = (d.tabs ?? []).filter((t) => t.id !== tabId);
        const panels = d.panels.filter((p) => p.tabId !== tabId);
        const newActiveTabId = get().activeTabId === tabId ?
            (tabs[0]?.id ?? null) :
            get().activeTabId;
        set({dashboard: {...d, panels, tabs}, isDirty: true, activeTabId: newActiveTabId});
      },
      reset: () => set({dashboard: null, isLoading: false, error: null, isDirty: false, selectedPanelId: null, activeTabId: null}),
    }),
    {
      limit: 50,
      partialize: (state) => ({
        dashboard: state.dashboard,
      }),
    }
  )
);
