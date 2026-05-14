/** Panel types supported by the dashboard system */
export type PanelType =
  | "timeseries" |
  "stat" |
  "table" |
  "barchart" |
  "logs" |
  "markdown" |
  "gauge" |
  "heatmap" |
  "piechart" |
  "row";

/** Datasource types */
export type DatasourceType = "mysql" | "clp" | "infinity";

/** Grid position on a 12-column CSS Grid */
export interface GridPos {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Reference to a datasource instance */
export interface DatasourceRef {
    type: DatasourceType;
    uid: string;
}

/** A query bound to a specific datasource */
export interface PanelQuery {
    refId: string;
    datasource: DatasourceRef;
    query: unknown;
}

/** Dashboard tab for organizing panels into groups */
export interface DashboardTab {
    id: string;
    title: string;
    order: number;
}

/** A panel is a single visualization unit on the dashboard */
export interface DashboardPanel {
    id: string;
    type: PanelType;
    title: string;
    description?: string;
    gridPos: GridPos;
    datasource: DatasourceRef;
    queries: PanelQuery[];
    options: Record<string, unknown>;
    fieldConfig?: FieldConfig;
    schemaVersion?: number;
    timeFrom?: string;
    transparent?: boolean;
    repeatVariable?: string;
    collapsed?: boolean;
    tabId?: string;
}

/** Field display configuration */
export interface FieldConfig {
    defaults?: FieldConfigDefault;
    overrides?: FieldConfigOverride[];
}

export interface FieldConfigDefault {
    unit?: string;
    decimals?: number;
    displayName?: string;
    color?: string;
    thresholds?: ThresholdConfig;
}

export interface FieldConfigOverride {
    matcher: {id: string; value: string};
    properties: Record<string, unknown>;
}

export interface ThresholdConfig {
    mode: "absolute" | "percentage";
    steps: {value: number; color: string}[];
}

/** Dashboard variable definition */
export interface DashboardVariable {
    id: string;
    name: string;
    label?: string;
    type: "query" | "custom" | "textbox" | "datasource" | "interval";
    defaultValue?: unknown;
    current?: {value: unknown; text: string};
    options?: {value: unknown; text: string; selected: boolean}[];
    datasource?: DatasourceRef;
    query?: string;
    multi?: boolean;
    includeAll?: boolean;

    /** Parent variable IDs this depends on (cascading) */
    dependsOn?: string[];
}

/** Dashboard-level time range */
export interface DashboardTimeRange {
    from: string;
    to: string;
}

/** A dashboard is a collection of panels arranged on a grid */
export interface Dashboard {
    id: string;
    uid: string;
    title: string;
    description?: string;
    tags: string[];
    variables: DashboardVariable[];
    timeRange: DashboardTimeRange;
    refreshInterval?: string;
    panels: DashboardPanel[];
    tabs?: DashboardTab[];
    annotations?: Annotation[];
    version: number;
    updatedAt: string;
    createdAt: string;
}

/** Annotation marking an event on time-series panels */
export interface Annotation {
    id: string;
    time: number;
    timeEnd?: number;
    title: string;
    tags?: string[];
    color?: string;
}

/** Summary returned by list endpoint */
export interface DashboardSummary {
    id: string;
    uid: string;
    title: string;
    tags: string[];
    updatedAt: string;
}

/** Datasource instance configuration */
export interface DatasourceInstance {
    id: string;
    uid: string;
    name: string;
    type: DatasourceType;
    config: Record<string, unknown>;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}
