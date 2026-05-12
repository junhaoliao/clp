import {
    type ComponentType,
    lazy,
} from "react";

import type {
    PanelComponentProps,
    PanelPlugin,
} from "../plugins/registry";


const LazyTimeSeriesPanel = lazy(async () => {
    const mod = await import("./time-series-panel");

    return {default: mod.TimeSeriesPanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

const LazyStatPanel = lazy(async () => {
    const mod = await import("./stat");

    return {default: mod.StatPanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

const LazyTablePanel = lazy(async () => {
    const mod = await import("./table");

    return {default: mod.TablePanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

const LazyBarChartPanel = lazy(async () => {
    const mod = await import("./bar-chart-panel");

    return {default: mod.BarChartPanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

const LazyLogsPanel = lazy(async () => {
    const mod = await import("./logs");

    return {default: mod.LogsPanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

const LazyMarkdownPanel = lazy(async () => {
    const mod = await import("./markdown");

    return {default: mod.MarkdownPanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

const LazyGaugePanel = lazy(async () => {
    const mod = await import("./gauge");

    return {default: mod.GaugePanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

const LazyHeatmapPanel = lazy(async () => {
    const mod = await import("./heatmap");

    return {default: mod.HeatmapPanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

const LazyPieChartPanel = lazy(async () => {
    const mod = await import("./pie-chart-panel");

    return {default: mod.PieChartPanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

const LazyRowPanel = lazy(async () => {
    const mod = await import("./row");

    return {default: mod.RowPanel as ComponentType<PanelComponentProps>};
}) as unknown as ComponentType<PanelComponentProps>;

export const builtinPlugins: PanelPlugin[] = [
    {
        meta: {
            type: "timeseries",
            name: "Time Series",
            icon: "LineChart",
            description: "Time series line chart",
            defaultGridPos: {w: 6, h: 4},
            minGridPos: {w: 2, h: 2},
            isTimeAware: true,
        },
        component: LazyTimeSeriesPanel,
        defaultOptions: () => ({showLegend: true}),
    },
    {
        meta: {
            type: "stat",
            name: "Stat",
            icon: "Hash",
            description: "Big number stat display",
            defaultGridPos: {w: 3, h: 3},
            minGridPos: {w: 2, h: 2},
        },
        component: LazyStatPanel,
        defaultOptions: () => ({decimals: 2, prefix: "", suffix: "", trendIndicator: true, sparkline: false}),
    },
    {
        meta: {
            type: "table",
            name: "Table",
            icon: "Table",
            description: "Tabular data display",
            defaultGridPos: {w: 6, h: 4},
            minGridPos: {w: 4, h: 2},
        },
        component: LazyTablePanel,
        defaultOptions: () => ({}),
    },
    {
        meta: {
            type: "barchart",
            name: "Bar Chart",
            icon: "BarChart3",
            description: "Bar chart visualization",
            defaultGridPos: {w: 6, h: 4},
            minGridPos: {w: 2, h: 2},
        },
        component: LazyBarChartPanel,
        defaultOptions: () => ({showLegend: true}),
    },
    {
        meta: {
            type: "logs",
            name: "Logs",
            icon: "FileText",
            description: "Log viewer panel",
            defaultGridPos: {w: 12, h: 6},
            minGridPos: {w: 4, h: 3},
            isTimeAware: true,
        },
        component: LazyLogsPanel,
        defaultOptions: () => ({showTimestamp: true, wrapLines: true}),
    },
    {
        meta: {
            type: "markdown",
            name: "Markdown",
            icon: "FileCode",
            description: "Markdown text panel",
            defaultGridPos: {w: 4, h: 3},
            minGridPos: {w: 2, h: 2},
        },
        component: LazyMarkdownPanel,
        defaultOptions: () => ({content: "# Panel\n\nEdit this markdown content."}),
    },
    {
        meta: {
            type: "gauge",
            name: "Gauge",
            icon: "Gauge",
            description: "Gauge indicator",
            defaultGridPos: {w: 3, h: 3},
            minGridPos: {w: 2, h: 2},
        },
        component: LazyGaugePanel,
        defaultOptions: () => ({min: 0, max: 100, decimals: 1}),
    },
    {
        meta: {
            type: "heatmap",
            name: "Heatmap",
            icon: "Grid3x3",
            description: "Heatmap visualization",
            defaultGridPos: {w: 6, h: 4},
            minGridPos: {w: 3, h: 3},
        },
        component: LazyHeatmapPanel,
        defaultOptions: () => ({cellSize: 12}),
    },
    {
        meta: {
            type: "piechart",
            name: "Pie Chart",
            icon: "PieChart",
            description: "Pie chart visualization",
            defaultGridPos: {w: 4, h: 4},
            minGridPos: {w: 3, h: 3},
        },
        component: LazyPieChartPanel,
        defaultOptions: () => ({showLegend: true}),
    },
    {
        meta: {
            type: "row",
            name: "Row",
            icon: "LayoutList",
            description: "Collapsible row container",
            defaultGridPos: {w: 12, h: 1},
            minGridPos: {w: 12, h: 1},
        },
        component: LazyRowPanel,
        defaultOptions: () => ({collapsed: false}),
    },
];
