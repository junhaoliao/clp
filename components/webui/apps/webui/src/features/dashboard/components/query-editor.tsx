import React from "react";
import type {DashboardPanel} from "@webui/common/dashboard/types";
import SqlCodeEditor from "./sql-code-editor";


/**
 *
 * @param panel
 * @param updatePanel
 * @param value
 */
function updateQuery (panel: DashboardPanel, updatePanel: (id: string, updates: Partial<DashboardPanel>) => void, value: unknown) {
    const queries = [...panel.queries];
    if (queries[0]) {
        queries[0] = {...queries[0], query: value};
    }
    updatePanel(panel.id, {queries});
}

/**
 *
 * @param val
 * @param fallback
 */
function strVal (val: unknown, fallback: string): string {
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
const MysqlQueryEditor = ({panel, updatePanel}: {panel: DashboardPanel; updatePanel: (id: string, updates: Partial<DashboardPanel>) => void}) => {
    const queryStr = strVal(panel.queries[0]?.query, "");

    return (
        <div>
            <label className={"text-xs text-muted-foreground"}>SQL Query</label>
            <div className={"mt-1"}>
                <SqlCodeEditor
                    height={96}
                    language={"sql"}
                    placeholder={"SELECT * FROM table WHERE time > $__from"}
                    value={queryStr}
                    onChange={(v) => {
                        updateQuery(panel, updatePanel, v);
                    }}/>
            </div>
            <p className={"text-[10px] text-muted-foreground mt-1"}>
                {"Use $variable or $\\u007Bvariable} for interpolation. Read-only queries only."}
            </p>
        </div>
    );
};

/**
 * @param root0
 * @param root0.panel
 * @param root0.updatePanel
 */
const ClpQueryEditor = ({panel, updatePanel}: {panel: DashboardPanel; updatePanel: (id: string, updates: Partial<DashboardPanel>) => void}) => {
    // CLP query is stored as an object: {queryString: string, datasets: string[]}
    const query0 = panel.queries[0]?.query;
    const queryObj = "object" === typeof query0 && null !== query0 ?
        query0 as Record<string, unknown> :
        {queryString: "string" === typeof query0 ? query0 : "", datasets: []};
    const queryString = strVal(queryObj["queryString"], "string" === typeof query0 ? query0 : "");
    const datasets = Array.isArray(queryObj["datasets"]) ?
        queryObj["datasets"] as string[] :
        [];

    const doUpdate = (patch: Record<string, unknown>) => {
        updateQuery(panel, updatePanel, {...queryObj, ...patch});
    };

    // Fetch available datasets from server
    const [availableDatasets, setAvailableDatasets] = React.useState<string[]>([]);
    React.useEffect(() => {
        fetch("/api/datasource/clp/datasets")
            .then((res) => res.ok ? res.json() : [])
            .then((data: string[]) => setAvailableDatasets(data))
            .catch(() => setAvailableDatasets([]));
    }, []);

    return (
        <div className={"space-y-2"}>
            <div>
                <label className={"text-xs text-muted-foreground"}>Datasets</label>
                <select
                    className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs"}
                    value={0 < datasets.length ? datasets[0] : ""}
                    onChange={(e) => {
                        const val = e.target.value;
                        doUpdate({datasets: val ? [val] : []});
                    }}
                >
                    <option value={""}>Default (all)</option>
                    {availableDatasets.map((ds) => (
                        <option key={ds} value={ds}>{ds}</option>
                    ))}
                </select>
                <p className={"text-[10px] text-muted-foreground mt-1"}>
                    {0 === availableDatasets.length ?
                        "No datasets found — ingest data first" :
                        "Select a dataset or use default"}
                </p>
            </div>
            <div>
                <label className={"text-xs text-muted-foreground"}>KQL Query</label>
                <div className={"mt-1"}>
                    <SqlCodeEditor
                        height={96}
                        language={"kql"}
                        placeholder={"level:ERROR AND service:web"}
                        value={queryString}
                        onChange={(v) => {
                            doUpdate({queryString: v});
                        }}/>
                </div>
            </div>
        </div>
    );
};

/**
 * @param root0
 * @param root0.panel
 * @param root0.updatePanel
 */
const InfinityQueryEditor = ({panel, updatePanel}: {panel: DashboardPanel; updatePanel: (id: string, updates: Partial<DashboardPanel>) => void}) => {
    const [query0] = panel.queries;
    const queryObj = "object" === typeof query0?.query && null !== query0.query ?
        query0.query as Record<string, unknown> :
        {};

    const doUpdate = (patch: Record<string, unknown>) => {
        updateQuery(panel, updatePanel, {...queryObj, ...patch});
    };

    return (
        <div className={"space-y-2"}>
            <div>
                <label className={"text-xs text-muted-foreground"}>URL</label>
                <input
                    className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs font-mono"}
                    placeholder={"https://api.example.com/data"}
                    type={"text"}
                    value={strVal(queryObj["url"], "")}
                    onChange={(e) => {
                        doUpdate({url: e.target.value});
                    }}/>
            </div>
            <div>
                <label className={"text-xs text-muted-foreground"}>Parser</label>
                <select
                    className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs"}
                    value={strVal(queryObj["parser"], "simple")}
                    onChange={(e) => {
                        doUpdate({parser: e.target.value});
                    }}
                >
                    <option value={"simple"}>Simple (JSON)</option>
                    <option value={"backend"}>Backend</option>
                </select>
            </div>
            <div>
                <label className={"text-xs text-muted-foreground"}>Root Selector (optional)</label>
                <input
                    className={"w-full h-7 mt-1 rounded border border-input bg-background px-2 text-xs font-mono"}
                    placeholder={"data.results"}
                    type={"text"}
                    value={strVal(queryObj["rootSelector"], "")}
                    onChange={(e) => {
                        doUpdate({rootSelector: e.target.value});
                    }}/>
            </div>
        </div>
    );
};

/**
 * @param root0
 * @param root0.panel
 * @param root0.updatePanel
 */
export const QueryEditor = ({panel, updatePanel}: {panel: DashboardPanel; updatePanel: (id: string, updates: Partial<DashboardPanel>) => void}) => {
    const dsType = panel.datasource.type as string;

    if ("mysql" === dsType) {
        return (
            <MysqlQueryEditor
                panel={panel}
                updatePanel={updatePanel}/>
        );
    }
    if ("clp" === dsType) {
        return (
            <ClpQueryEditor
                panel={panel}
                updatePanel={updatePanel}/>
        );
    }
    if ("infinity" === dsType) {
        return (
            <InfinityQueryEditor
                panel={panel}
                updatePanel={updatePanel}/>
        );
    }

    const queryStr = strVal(panel.queries[0]?.query, "");

    return (
        <div>
            <label className={"text-xs text-muted-foreground"}>Query</label>
            <div className={"mt-1"}>
                <SqlCodeEditor
                    height={80}
                    language={"sql"}
                    value={queryStr}
                    onChange={(v) => {
                        updateQuery(panel, updatePanel, v);
                    }}/>
            </div>
        </div>
    );
};
