import type {DashboardPanel} from "@webui/common/dashboard/types";

import {getPanelPlugin} from "../plugins/registry";
import {useDashboardLayoutStore} from "../stores/layout-store";
import {QueryEditor} from "./query-editor";


const EMPTY_DESCRIPTION = "";

/**
 *
 * @param val
 * @param fallback
 */
function strOpt (val: unknown, fallback: string): string {
    if ("string" === typeof val) {
        return val;
    }
    if ("number" === typeof val || "boolean" === typeof val) {
        return String(val);
    }

    return fallback;
}

/**
 * @param root0
 * @param root0.panel
 * @param root0.updatePanel
 */
const PanelTypeOptions = ({panel, updatePanel}: {panel: DashboardPanel; updatePanel: (id: string, updates: Partial<DashboardPanel>) => void}) => {
    if ("markdown" === panel.type) {
        return (
            <div className="space-y-3">
                <div>
                    <label className={"text-xs text-muted-foreground"}>Content</label>
                    <textarea
                        className={"w-full h-32 mt-1 rounded border border-input bg-background px-2 py-1 text-xs font-mono"}
                        value={strOpt(panel.options["content"], "")}
                        onChange={(e) => {
                            updatePanel(panel.id, {options: {...panel.options, content: e.target.value}});
                        }}/>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        checked={true === panel.options["enableDataBinding"]}
                        id={"enableDataBinding"}
                        type={"checkbox"}
                        onChange={(e) => {
                            const updates: Partial<DashboardPanel> = {
                                options: {...panel.options, enableDataBinding: e.target.checked},
                            };
                            if (e.target.checked && 0 === panel.queries.length) {
                                const dsType = panel.datasource.type as "mysql" | "clp" | "infinity";
                                updates.datasource = {...panel.datasource, type: dsType};
                                updates.queries = [{refId: "A", datasource: {type: dsType, uid: panel.datasource.uid}, query: ""}];
                            }
                            updatePanel(panel.id, updates);
                        }}/>
                    <label
                        className={"text-xs"}
                        htmlFor={"enableDataBinding"}
                    >
                        Enable query data binding
                    </label>
                </div>
            </div>
        );
    }

    if ("timeseries" === panel.type || "barchart" === panel.type || "piechart" === panel.type) {
        return (
            <div className={"flex items-center gap-2"}>
                <input
                    checked={false !== panel.options["showLegend"]}
                    id={"showLegend"}
                    type={"checkbox"}
                    onChange={(e) => {
                        updatePanel(panel.id, {options: {...panel.options, showLegend: e.target.checked}});
                    }}/>
                <label
                    className={"text-xs"}
                    htmlFor={"showLegend"}
                >
                    Show Legend
                </label>
            </div>
        );
    }

    if ("gauge" === panel.type) {
        return (
            <div className={"grid grid-cols-2 gap-2"}>
                <div>
                    <label className={"text-xs text-muted-foreground"}>Min</label>
                    <input
                        className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs"}
                        type={"number"}
                        value={Number(panel.options["min"] ?? 0)}
                        onChange={(e) => {
                            updatePanel(panel.id, {options: {...panel.options, min: Number(e.target.value)}});
                        }}/>
                </div>
                <div>
                    <label className={"text-xs text-muted-foreground"}>Max</label>
                    <input
                        className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs"}
                        type={"number"}
                        value={Number(panel.options["max"] ?? 100)}
                        onChange={(e) => {
                            updatePanel(panel.id, {options: {...panel.options, max: Number(e.target.value)}});
                        }}/>
                </div>
            </div>
        );
    }

    if ("stat" === panel.type) {
        return (
            <div className={"grid grid-cols-2 gap-2"}>
                <div>
                    <label className={"text-xs text-muted-foreground"}>Prefix</label>
                    <input
                        className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs"}
                        type={"text"}
                        value={strOpt(panel.options["prefix"], "")}
                        onChange={(e) => {
                            updatePanel(panel.id, {options: {...panel.options, prefix: e.target.value}});
                        }}/>
                </div>
                <div>
                    <label className={"text-xs text-muted-foreground"}>Suffix</label>
                    <input
                        className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs"}
                        type={"text"}
                        value={strOpt(panel.options["suffix"], "")}
                        onChange={(e) => {
                            updatePanel(panel.id, {options: {...panel.options, suffix: e.target.value}});
                        }}/>
                </div>
            </div>
        );
    }

    return null;
};

/**
 * @param root0
 * @param root0.panel
 * @param root0.updatePanel
 */
const GridPositionEditor = ({panel, updatePanel}: {panel: DashboardPanel; updatePanel: (id: string, updates: Partial<DashboardPanel>) => void}) => {
    const {gridPos} = panel;

    return (
        <div>
            <label className={"text-xs text-muted-foreground"}>Grid Position</label>
            <div className={"grid grid-cols-4 gap-2 mt-1"}>
                {(["x",
                    "y",
                    "w",
                    "h"] as const).map((key) => (
                    <div key={key}>
                        <label className={"text-[10px] text-muted-foreground"}>
                            {key.toUpperCase()}
                        </label>
                        <input
                            className={"w-full h-6 rounded border border-input bg-background px-1.5 text-xs"}
                            type={"number"}
                            value={gridPos[key]}
                            onChange={(e) => {
                                updatePanel(panel.id, {gridPos: {...gridPos, [key]: Number(e.target.value)}});
                            }}/>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const PanelOptionsEditor = () => {
    const dashboard = useDashboardLayoutStore((s) => s.dashboard);
    const selectedPanelId = useDashboardLayoutStore((s) => s.selectedPanelId);
    const updatePanel = useDashboardLayoutStore((s) => s.updatePanel);
    const removePanel = useDashboardLayoutStore((s) => s.removePanel);

    if (!dashboard || !selectedPanelId) {
        return null;
    }

    const panel = dashboard.panels.find((p) => p.id === selectedPanelId);
    if (!panel) {
        return null;
    }

    const plugin = getPanelPlugin(panel.type);

    return (
        <div className={"p-4 space-y-4"}>
            <div className={"flex items-center justify-between"}>
                <h3 className={"text-sm font-semibold"}>
                    {plugin?.meta.name ?? panel.type}
                </h3>
            </div>

            <div>
                <label className={"text-xs text-muted-foreground"}>Title</label>
                <input
                    className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs"}
                    type={"text"}
                    value={panel.title}
                    onChange={(e) => {
                        updatePanel(panel.id, {title: e.target.value});
                    }}/>
            </div>

            <div>
                <label className={"text-xs text-muted-foreground"}>Description</label>
                <input
                    className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs"}
                    type={"text"}
                    value={panel.description ?? EMPTY_DESCRIPTION}
                    onChange={(e) => {
                        const val = e.target.value;
                        if ("" === val) {
                            const opts = {...panel.options};
                            delete opts["description"];
                            updatePanel(panel.id, {options: opts});
                        } else {
                            updatePanel(panel.id, {description: val});
                        }
                    }}/>
            </div>

            <PanelTypeOptions
                panel={panel}
                updatePanel={updatePanel}/>

            {(false !== plugin?.meta.requiresQuery || true === panel.options["enableDataBinding"]) && (<>
                <div>
                    <label className={"text-xs text-muted-foreground"}>Datasource Type</label>
                    <select
                        className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs"}
                        value={panel.datasource.type}
                        onChange={(e) => {
                            const newType = e.target.value as "mysql" | "clp" | "infinity";
                            const queries = panel.queries.map((q) => {
                                const query = "clp" === newType && "string" === typeof q.query ?
                                    {queryString: q.query, datasets: []} :
                                    "mysql" === newType && "object" === typeof q.query && null !== q.query ?
                                        (q.query as Record<string, unknown>)["queryString"] ?? "" :
                                        q.query;
                                return {...q, datasource: {...q.datasource, type: newType}, query};
                            });
                            updatePanel(panel.id, {
                                datasource: {...panel.datasource, type: newType},
                                queries,
                            });
                        }}
                    >
                        <option value={"mysql"}>MySQL</option>
                        <option value={"clp"}>CLP/KQL</option>
                        <option value={"infinity"}>Infinity (HTTP)</option>
                    </select>
                </div>

                {0 < panel.queries.length && (
                    <QueryEditor
                        panel={panel}
                        updatePanel={updatePanel}/>
                )}

                <div>
                    <label className={"text-xs text-muted-foreground"}>Time Override (relative, e.g. now-1h)</label>
                    <input
                        className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs font-mono"}
                        placeholder={"Uses dashboard range if empty"}
                        type={"text"}
                        value={panel.timeFrom ?? ""}
                        onChange={(e) => {
                            updatePanel(panel.id, {timeFrom: e.target.value || undefined} as Partial<DashboardPanel>);
                        }}/>
                </div>
            </>)}

            <GridPositionEditor
                panel={panel}
                updatePanel={updatePanel}/>

            <button
                className={"w-full py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"}
                onClick={() => {
                    removePanel(panel.id);
                }}
            >
                Remove Panel
            </button>
        </div>
    );
};
