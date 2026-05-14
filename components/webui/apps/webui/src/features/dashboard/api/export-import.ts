import type {Dashboard} from "@webui/common/dashboard/types";


/**
 *
 * @param dashboard
 */
export function exportDashboard (dashboard: Dashboard): string {
    const exportData = {
        ...dashboard,
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 *
 * @param json
 */
export function importDashboard (json: string): {dashboard: Partial<Dashboard>; error?: string} {
    try {
        const parsed = JSON.parse(json);

        if (!parsed.title || "string" !== typeof parsed.title) {
            return {dashboard: {}, error: "Dashboard must have a title"};
        }

        const dashboard: Partial<Dashboard> = {
            title: parsed.title,
            description: parsed.description,
            tags: Array.isArray(parsed.tags) ?
                parsed.tags :
                [],
            variables: Array.isArray(parsed.variables) ?
                parsed.variables :
                [],
            timeRange: parsed.timeRange ?? {from: "now-6h", to: "now"},
            refreshInterval: parsed.refreshInterval,
            panels: Array.isArray(parsed.panels) ?
                parsed.panels.map((p: Record<string, unknown>, i: number) => ({
                    id: p["id"] ?? `imported-${i}`,
                    type: p["type"] ?? "timeseries",
                    title: p["title"] ?? "Imported Panel",
                    gridPos: p["gridPos"] ?? {x: 0, y: i * 4, w: 6, h: 4},
                    datasource: p["datasource"] ?? {type: "mysql", uid: "default"},
                    queries: Array.isArray(p["queries"]) ?
                        p["queries"] :
                        [],
                    options: p["options"] ?? {},
                })) :
                [],
        };

        return {dashboard};
    } catch {
        return {dashboard: {}, error: "Invalid JSON"};
    }
}

/**
 *
 * @param content
 * @param filename
 */
export function downloadJson (content: string, filename: string): void {
    const blob = new Blob([content], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
