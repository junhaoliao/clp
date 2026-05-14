import type {
    DataField,
    DataFrame,
} from "../types.js";
import {QUERY_LIMITS} from "../types.js";


export interface MySQLDatasourceConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

/**
 * Detect if SQL has GROUP BY (for two-tier row limits)
 *
 * @param sql
 */
export function hasGroupBy (sql: string): boolean {
    const normalized = sql.toUpperCase().replace(/\s+/g, " ");

    // Simple heuristic: look for GROUP BY outside of string literals
    return (/\bGROUP\s+BY\b/).test(normalized);
}

/**
 * Get the applicable row limit based on query type
 *
 * @param sql
 */
export function getApplicableRowLimit (sql: string): number {
    return hasGroupBy(sql) ?
        QUERY_LIMITS.MAX_AGGREGATED_QUERY_ROWS :
        QUERY_LIMITS.MAX_UNAGGREGATED_QUERY_ROWS;
}

/**
 * Check if SQL is a SELECT query (as opposed to SHOW, DESCRIBE, etc.)
 *
 * @param sql
 */
function isSelectQuery (sql: string): boolean {
    const normalized = sql.trim().toUpperCase();
    return normalized.startsWith("SELECT") || normalized.startsWith("(");
}

/**
 * Inject LIMIT into SQL if not already present; skips non-SELECT statements
 *
 * @param sql
 * @param limit
 */
export function injectLimit (sql: string, limit: number): string {
    if (!isSelectQuery(sql)) {
        return sql;
    }
    const normalized = sql.toUpperCase().trim();
    if ((/\bLIMIT\s+\d+/i).test(normalized)) {
        return sql;
    }

    return `${sql.replace(/;\s*$/, "")} LIMIT ${limit + 1}`;
}

/**
 * Validate SQL to prevent destructive operations
 *
 * @param sql
 */
export function validateSqlSafety (sql: string): {safe: boolean; reason?: string} {
    const normalized = sql.toUpperCase().replace(/\s+/g, " ");
    const destructivePatterns = [
        /\bDROP\b/,
        /\bDELETE\b/,
        /\bUPDATE\b/,
        /\bINSERT\b/,
        /\bALTER\b/,
        /\bTRUNCATE\b/,
        /\bCREATE\b/,
        /\bGRANT\b/,
        /\bREVOKE\b/,
    ];

    for (const pattern of destructivePatterns) {
        if (pattern.test(normalized)) {
            return {safe: false, reason: `Destructive operation detected: ${pattern.source.replace(/\\b/g, "")}`};
        }
    }

    return {safe: true};
}

/**
 * Parse MySQL rows into DataFrame format, optionally detecting truncation
 *
 * @param rows
 * @param name
 * @param appliedLimit
 */
export function rowsToDataFrame (rows: Record<string, unknown>[], name: string = "", appliedLimit?: number): DataFrame {
    if (0 === rows.length) {
        return {name, fields: [], length: 0};
    }

    const truncated = appliedLimit !== undefined && rows.length > appliedLimit;
    const displayRows = truncated ?
        rows.slice(0, appliedLimit) :
        rows;

    const first = displayRows[0]!;
    const keys = Object.keys(first);
    const fields: DataField[] = keys.map((key) => ({
        name: key,
        type: inferType(first[key]),
        values: displayRows.map((row) => row[key]),
    }));

    return {name,
        fields,
        length: displayRows.length,
        ...(truncated ?
            {rowsTruncated: true} :
            {})};
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
    if (value instanceof Date) {
        return "time";
    }
    if ("string" === typeof value) {
        const d = new Date(value);
        if (!isNaN(d.getTime()) && 8 < value.length) {
            return "time";
        }

        return "string";
    }

    return "string";
}
