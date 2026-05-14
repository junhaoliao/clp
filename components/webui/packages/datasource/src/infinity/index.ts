import type {
    DataField,
    DataFrame,
    InfinityQuery,
    QueryResult,
} from "../types.js";
import {
    QUERY_LIMITS,
    QUERY_TIMEOUTS,
} from "../types.js";
import {buildAuthHeaders} from "./auth.js";
import {
    buildPaginatedUrl,
    getMaxPages,
    isPaginationComplete,
} from "./pagination.js";
import {
    parseHtmlResponse,
    parseXmlResponse,
} from "./xml-parser.js";


/**
 * Parse JSON response into DataFrame format
 *
 * @param data
 * @param rootSelector
 * @param columns
 */
export function parseJsonResponse (
    data: unknown,
    rootSelector?: string,
    columns?: {selector: string; text: string; type: "string" | "number" | "time"}[],
): DataFrame[] {
    let records: unknown[] = [];

    // Apply root selector (simple dot-notation path)
    if (rootSelector && "object" === typeof data && null !== data) {
        let current: unknown = data;
        for (const key of rootSelector.split(".")) {
            if (current && "object" === typeof current) {
                current = (current as Record<string, unknown>)[key];
            }
        }
        if (Array.isArray(current)) {
            records = current;
        }
    } else if (Array.isArray(data)) {
        records = data;
    }

    if (0 === records.length) {
        return [{name: "", fields: [], length: 0}];
    }

    // If columns are specified, use them; otherwise auto-detect from first record
    if (columns && 0 < columns.length) {
        const fields: DataField[] = columns.map((col) => ({
            name: col.text,
            type: col.type,
            values: records.map((record) => {
                if (record && "object" === typeof record) {
                    return getNestedValue(record as Record<string, unknown>, col.selector);
                }

                return undefined;
            }),
        }));

        return [{name: "", fields, length: records.length}];
    }

    // Auto-detect fields from first record
    const first = records[0];
    if (first && "object" === typeof first && !Array.isArray(first)) {
        const keys = Object.keys(first);
        const fields: DataField[] = keys.map((key) => ({
            name: key,
            type: inferType((first as Record<string, unknown>)[key]),
            values: records.map((r) => (r as Record<string, unknown>)[key]),
        }));

        return [{name: "", fields, length: records.length}];
    }

    return [{name: "", fields: [{name: "value", type: "string", values: records.map(String)}], length: records.length}];
}

/**
 * Get a nested value using dot-notation selector
 *
 * @param obj
 * @param selector
 */
function getNestedValue (obj: Record<string, unknown>, selector: string): unknown {
    let current: unknown = obj;
    for (const key of selector.split(".")) {
        if (current && "object" === typeof current) {
            current = (current as Record<string, unknown>)[key];
        } else {
            return undefined;
        }
    }

    return current;
}

/**
 *
 * @param value
 */
function inferType (value: unknown): "string" | "number" | "time" | "boolean" {
    if ("number" === typeof value) {
        return "number";
    }
    if ("boolean" === typeof value) {
        return "boolean";
    }

    return "string";
}

/**
 * Parse CSV response into DataFrame format
 *
 * @param text
 * @param columns
 * @param delimiter
 */
export function parseCsvResponse (
    text: string,
    columns?: {selector: string; text: string; type: "string" | "number" | "time"}[],
    delimiter: string = ",",
): DataFrame[] {
    const lines = text.trim().split("\n");
    if (2 > lines.length) {
        return [{name: "", fields: [], length: 0}];
    }

    const headers = parseCsvLine(lines[0]!, delimiter);
    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]!.trim();
        if (line) {
            rows.push(parseCsvLine(line, delimiter));
        }
    }

    const colDefs = columns && 0 < columns.length ?
        columns :
        headers.map((h) => ({selector: h, text: h, type: "string" as const}));

    const fields: DataField[] = colDefs.map((col, idx) => ({
        name: col.text,
        type: col.type,
        values: rows.map((row) => {
            const raw = row[idx] ?? "";
            if ("number" === col.type) {
                const num = Number(raw);
                return isNaN(num) ?
                    null :
                    num;
            }

            return raw;
        }),
    }));

    return [{name: "", fields, length: rows.length}];
}

/**
 * Parse a single CSV line, handling quoted fields
 *
 * @param line
 * @param delimiter
 */
function parseCsvLine (line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if ('"' === char) {
            if (inQuotes && '"' === line[i + 1]) {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

/**
 * Execute Infinity datasource query
 *
 * @param query
 * @param allowedHosts
 */
export async function executeInfinityQuery (
    query: InfinityQuery,
    allowedHosts?: string[],
): Promise<QueryResult> {
    if ("inline" === query.source) {
        if ("xml" === query.type) {
            const frames = parseXmlResponse(query.data ?? "", query.rootSelector, query.columns);
            return {data: frames};
        }
        if ("html" === query.type) {
            const frames = parseHtmlResponse(query.data ?? "", query.columns);
            return {data: frames};
        }
        const parsed = JSON.parse(query.data ?? "{}");
        const frames = parseJsonResponse(parsed, query.rootSelector, query.columns);
        return {data: frames};
    }

    if (!query.url) {
        return {data: [], error: "URL is required for URL source"};
    }

    // Check allowed hosts
    if (allowedHosts && 0 < allowedHosts.length) {
        const urlHost = new URL(query.url).hostname;
        if (!allowedHosts.some((allowed) => urlHost === allowed || urlHost.endsWith(`.${allowed}`))) {
            return {data: [], error: `Host ${urlHost} not in allowed hosts list`};
        }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, QUERY_TIMEOUTS.INFINITY_FETCH_TIMEOUT_MS);

    const paginationMode = query.pagination?.mode ?? "none";
    const maxPagesOpts: {mode: string; maxPages?: number} = {mode: paginationMode};
    if (undefined !== query.pagination?.maxPages) {
        maxPagesOpts.maxPages = query.pagination.maxPages;
    }
    const maxPages = getMaxPages(maxPagesOpts);

    try {
        const headers: Record<string, string> = {
            ...buildAuthHeaders(query.auth),
            ...query.urlOptions?.headers,
        };

        const fetchOptions: RequestInit = {
            method: query.urlOptions?.method ?? "GET",
            headers,
            signal: controller.signal,
        };

        if (query.urlOptions?.body) {
            fetchOptions.body = query.urlOptions.body;
        }

        const allFrames: DataFrame[] = [];
        let totalResponseBytes = 0;

        for (let page = 1; page <= maxPages; page++) {
            const pageUrl = buildPaginatedUrl(query.url, {
                ...query.pagination,
                mode: paginationMode,
                page,
            });

            const response = await fetch(pageUrl, fetchOptions);

            if (!response.ok) {
                if (0 < allFrames.length) {
                    return {data: allFrames};
                }

                return {data: [], error: `HTTP ${response.status}: ${response.statusText}`};
            }

            const contentType = response.headers.get("content-type") ?? "";
            const text = await response.text();
            totalResponseBytes += text.length;

            if (totalResponseBytes > QUERY_LIMITS.MAX_INFINITY_RESPONSE_BYTES) {
                if (0 < allFrames.length) {
                    return {data: allFrames};
                }

                return {data: [], error: `Response exceeds ${QUERY_LIMITS.MAX_INFINITY_RESPONSE_BYTES / 1024 / 1024}MB limit`};
            }

            let frames: DataFrame[];
            if (contentType.includes("json") || "json" === query.type) {
                const parsed = JSON.parse(text);
                frames = parseJsonResponse(parsed, query.rootSelector, query.columns);
            } else if (contentType.includes("csv") || "csv" === query.type) {
                frames = parseCsvResponse(text, query.columns);
            } else if (contentType.includes("xml") || "xml" === query.type) {
                frames = parseXmlResponse(text, query.rootSelector, query.columns);
            } else if (contentType.includes("html") || "html" === query.type) {
                frames = parseHtmlResponse(text, query.columns);
            } else {
                frames = [{
                    name: "",
                    fields: [{name: "value", type: "string", values: [text]}],
                    length: 1,
                }];
            }

            allFrames.push(...frames);

            const isCompleteOpts: {mode: string; pageSize?: number; resultCount: number} = {
                mode: paginationMode,
                resultCount: frames[0]?.length ?? 0,
            };

            if (undefined !== query.pagination?.pageSize) {
                isCompleteOpts.pageSize = query.pagination.pageSize;
            }
            if (isPaginationComplete(isCompleteOpts)) {
                break;
            }
        }

        return {data: allFrames};
    } catch (error) {
        if (error instanceof DOMException && "AbortError" === error.name) {
            return {data: [], error: "Infinity fetch timed out"};
        }

        return {data: [],
            error: error instanceof Error ?
                error.message :
                "Unknown error"};
    } finally {
        clearTimeout(timeout);
    }
}
