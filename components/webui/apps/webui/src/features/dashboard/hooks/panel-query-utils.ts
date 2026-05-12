import type {DashboardPanel} from "@webui/common/dashboard/types";
import type {DataFrame, DataQueryResponse} from "@webui/datasource/types";
import {parameterizeVariables} from "./variable-interpolation";

export {parseTimeRange} from "./parse-time-range";

interface ExecutePanelQueryOpts {
    panel: DashboardPanel;
    replaceVariables: (str: string) => string;
    resolvedVars: Record<string, unknown>;
    from: number;
    to: number;
    signal: AbortSignal;
}

/**
 *
 * @param opts
 * @param opts.panel
 * @param opts.replaceVariables
 * @param opts.resolvedVars
 * @param opts.from
 * @param opts.to
 * @param opts.signal
 */
export async function executePanelQuery (opts: ExecutePanelQueryOpts): Promise<DataQueryResponse> {
    const dsType = opts.panel.datasource.type;
    const interpolatedQueries = opts.panel.queries.map((q) => {
        if ("string" !== typeof q.query) {
            return {...q};
        }

        if ("mysql" === dsType) {
            const {params, sql} = parameterizeVariables(q.query, opts.resolvedVars);
            return {...q, params, query: sql};
        }

        return {...q, query: opts.replaceVariables(q.query)};
    });

    if (0 === interpolatedQueries.length) {
        return {data: []};
    }

    // CLP queries use SSE streaming for progressive results from the async job queue
    if ("clp" === dsType) {
        return executeClpPanelQuery(interpolatedQueries, opts);
    }

    const response = await fetch(`/api/datasource/${dsType}/query`, {
        body: JSON.stringify({
            from: opts.from,
            queries: interpolatedQueries,
            range: {from: opts.from, to: opts.to},
            requestId: `panel-${opts.panel.id}`,
            scopedVars: {},
            to: opts.to,
        }),
        headers: {"Content-Type": "application/json"},
        method: "POST",
        signal: opts.signal,
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`Query failed (${response.status}): ${text}`);
    }

    return response.json() as Promise<DataQueryResponse>;
}

/**
 * Executes a CLP panel query via SSE streaming, accumulating partial DataFrames.
 */
async function executeClpPanelQuery (
    queries: {refId: string; query: unknown; [key: string]: unknown}[],
    opts: ExecutePanelQueryOpts,
): Promise<DataQueryResponse> {
    const response = await fetch(`/api/datasource/clp/query/stream`, {
        body: JSON.stringify({
            from: opts.from,
            queries,
            range: {from: opts.from, to: opts.to},
            requestId: `panel-${opts.panel.id}`,
            scopedVars: {},
            to: opts.to,
        }),
        headers: {"Content-Type": "application/json"},
        method: "POST",
        signal: opts.signal,
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`CLP query failed (${response.status}): ${text}`);
    }

    return consumeSSEDataQueryResponse(response);
}

/**
 * Consumes an SSE stream that emits DataQueryResponse events,
 * accumulating partial DataFrames into a merged response.
 */
async function consumeSSEDataQueryResponse (response: Response): Promise<DataQueryResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
        return {data: []};
    }

    const decoder = new TextDecoder();
    let buffer = "";
    const mergedFrames = new Map<string, DataFrame>();
    const errors: {message: string; refId?: string}[] = [];

    try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
            const {done, value} = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line.startsWith("data: ")) {
                    continue;
                }

                const json = line.slice(6);
                if (0 === json.length) {
                    continue;
                }

                try {
                    const event = JSON.parse(json) as {
                        type: string;
                        data?: DataFrame[];
                        errors?: {message: string; refId?: string}[];
                    };

                    if ("error" === event.type && event.errors) {
                        errors.push(...event.errors);
                    }

                    if (("partial" === event.type || "complete" === event.type) && event.data) {
                        for (const frame of event.data) {
                            mergeDataFrame(mergedFrames, frame);
                        }
                    }
                } catch {
                    // Skip malformed SSE events
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    return {
        data: Array.from(mergedFrames.values()),
        ...(0 < errors.length ? {errors} : {}),
    };
}

/**
 * Merges a partial DataFrame into the accumulated frame map.
 * New rows are appended to the existing frame's field values.
 */
export function mergeDataFrame (accumulated: Map<string, DataFrame>, partial: DataFrame): void {
    const existing = accumulated.get(partial.name);
    if (!existing) {
        // First frame for this refId — store as-is (clone fields to avoid mutation)
        accumulated.set(partial.name, {
            name: partial.name,
            fields: partial.fields.map((f) => ({
                ...f,
                values: [...f.values],
            })),
            length: partial.length,
            ...(partial.rowsTruncated ? {rowsTruncated: true} : {}),
        });
        return;
    }

    // Append new values to existing fields
    for (const field of partial.fields) {
        const existingField = existing.fields.find((f) => f.name === field.name);
        if (existingField) {
            existingField.values.push(...field.values);
        } else {
            existing.fields.push({...field, values: [...field.values]});
        }
    }

    existing.length += partial.length;
    if (partial.rowsTruncated) {
        existing.rowsTruncated = true;
    }
}
