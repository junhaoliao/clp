import type {DashboardPanel} from "@webui/common/dashboard/types";


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
            <textarea
                className={"w-full h-24 mt-1 rounded border border-input bg-background px-2 py-1 text-xs font-mono"}
                placeholder={"SELECT * FROM table WHERE time > $__from"}
                value={queryStr}
                onChange={(e) => {
                    updateQuery(panel, updatePanel, e.target.value);
                }}/>
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
    const queryStr = strVal(panel.queries[0]?.query, "");

    return (
        <div>
            <label className={"text-xs text-muted-foreground"}>KQL Query</label>
            <textarea
                className={"w-full h-24 mt-1 rounded border border-input bg-background px-2 py-1 text-xs font-mono"}
                placeholder={"level:ERROR AND service:web"}
                value={queryStr}
                onChange={(e) => {
                    updateQuery(panel, updatePanel, e.target.value);
                }}/>
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
            <textarea
                className={"w-full h-20 mt-1 rounded border border-input bg-background px-2 py-1 text-xs font-mono"}
                value={queryStr}
                onChange={(e) => {
                    updateQuery(panel, updatePanel, e.target.value);
                }}/>
        </div>
    );
};
