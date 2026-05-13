import {tbValidator} from "@hono/typebox-validator";
import type {TSchema} from "@sinclair/typebox";
import {CreateDatasourceSchema, type CreateDatasourceRequest, UpdateDatasourceSchema, type UpdateDatasourceRequest} from "@webui/common/dashboard/schemas";
import type {DatasourceInstance} from "@webui/common/dashboard/types";
import {getCircuitBreaker} from "@webui/datasource/circuit-breaker";
import {executeInfinityQuery} from "@webui/datasource/infinity";
import {
    getApplicableRowLimit,
    injectLimit,
    rowsToDataFrame,
    validateSqlSafety,
} from "@webui/datasource/mysql";
import {QUERY_TIMEOUTS} from "@webui/datasource/types";
import {Hono} from "hono";
import {streamSSE} from "hono/streaming";
import {nanoid} from "nanoid";

import {executeClpQueryStreaming} from "./clp-query-executor.js";
import type {DatasourceStorage} from "../storage/datasource-storage.js";
import {InMemoryDatasourceStorage} from "../storage/datasource-storage.js";
import {toMySQLDatetime} from "../storage/datetime-utils.js";
import settings from "../../settings.json" with {type: "json"};


/** Datasource storage (swappable: in-memory for dev, MySQL for production) */
let dsStorage: DatasourceStorage = new InMemoryDatasourceStorage();

/**
 *
 * @param s
 */
export function setDatasourceStorage (s: DatasourceStorage): void {
    dsStorage = s;
}

/** Allowed hosts for Infinity datasource (configurable via env) */
// eslint-disable-next-line dot-notation
const infinityAllowedHosts: string[] = (process.env["INFINITY_ALLOWED_HOSTS"] ?? "").split(",").filter(Boolean);

/** Active query abort controllers for cancellation */
const activeQueries = new Map<string, AbortController>();

/** Datasource routes (Hono, chained for RPC type inference) */
export const datasourceRoutes = new Hono()
    .get("/", async (c) => {
        const datasources = await dsStorage.list();
        return c.json(datasources);
    })
    .post("/", tbValidator("json", CreateDatasourceSchema as unknown as TSchema), async (c) => {
        const body = c.req.valid("json") as CreateDatasourceRequest;
        const now = toMySQLDatetime();
        const datasource: DatasourceInstance = {
            id: nanoid(21),
            uid: body.uid ?? nanoid(10),
            name: body.name,
            type: body.type,
            config: body.config,
            isDefault: body.isDefault ?? false,
            createdAt: now,
            updatedAt: now,
        };

        await dsStorage.create(datasource);

        return c.json(datasource, 201);
    })
    .get("/:uid", async (c) => {
        const uid = c.req.param("uid");
        const datasource = await dsStorage.get(uid);
        if (!datasource) {
            return c.json({error: "Datasource not found"}, 404);
        }

        return c.json(datasource);
    })
    .put("/:uid", tbValidator("json", UpdateDatasourceSchema as unknown as TSchema), async (c) => {
        const uid = c.req.param("uid");
        const body = c.req.valid("json") as UpdateDatasourceRequest;
        const updated = await dsStorage.update(uid, body);
        if (!updated) {
            return c.json({error: "Datasource not found"}, 404);
        }

        return c.json(updated);
    })
    .delete("/:uid", async (c) => {
        const uid = c.req.param("uid");
        const deleted = await dsStorage.delete(uid);
        if (!deleted) {
            return c.json({error: "Datasource not found"}, 404);
        }

        return c.json({message: "Datasource deleted"}, 200);
    })
    .post("/:type/query", async (c) => {
        const dsType = c.req.param("type");
        const body = await c.req.json();
        const requestId = body.requestId ?? nanoid(10);

        // Cancel any previous query with the same requestId
        const previousController = activeQueries.get(requestId);
        if (previousController) {
            previousController.abort();
        }

        // Check circuit breaker
        const cb = getCircuitBreaker(dsType);
        if (!cb.canExecute()) {
            return c.json({data: [], errors: [{message: `Datasource '${dsType}' circuit breaker is open. Retrying after cooldown.`, refId: requestId}]}, 503);
        }

        const controller = new AbortController();
        activeQueries.set(requestId, controller);

        // Abort the query if the client disconnects
        const abortHandler = () => {
            controller.abort();
        };
        c.req.raw.signal.addEventListener("abort", abortHandler);

        if ("half-open" === cb.getState()) {
            cb.recordHalfOpenAttempt();
        }

        try {
            const result = await executeDatasourceQuery(dsType, body);
            cb.recordSuccess();

            return c.json(result);
        } catch (error) {
            if (error instanceof Error && "AbortError" === error.name) {
                return c.json({data: [], errors: [{message: "Query cancelled", refId: requestId}]});
            }
            cb.recordFailure();
            const message = error instanceof Error ?
                error.message :
                "Unknown error";

            return c.json({data: [], errors: [{message, refId: requestId}]}, 500);
        } finally {
            c.req.raw.signal.removeEventListener("abort", abortHandler);
            activeQueries.delete(requestId);
        }
    })
    .post("/:type/test", async (c) => {
        const dsType = c.req.param("type");
        const cb = getCircuitBreaker(dsType);
        try {
            const connected = await testDatasourceConnection(dsType);
            if (connected) {
                cb.recordSuccess();
            } else {
                cb.recordFailure();
            }

            return c.json({status: connected ?
                "ok" :
                "error",
            message: `${dsType} datasource ${connected ?
                "connection successful" :
                "connection failed"}`});
        } catch (error) {
            cb.recordFailure();
            const message = error instanceof Error ?
                error.message :
                "Unknown error";

            return c.json({status: "error", message});
        }
    })
    .post("/:type/query/stream", async (c) => {
        const dsType = c.req.param("type");
        const body = await c.req.json();
        const requestId = body.requestId ?? nanoid(10);

        const cb = getCircuitBreaker(dsType);
        if (!cb.canExecute()) {
            return c.json({data: [], errors: [{message: `Datasource '${dsType}' circuit breaker is open.`, refId: requestId}]}, 503);
        }

        if ("half-open" === cb.getState()) {
            cb.recordHalfOpenAttempt();
        }

        return streamSSE(c, async (stream) => {
            try {
                const result = await executeDatasourceQueryStreaming(dsType, body, async (partialResult) => {
                    await stream.writeSSE({data: JSON.stringify({type: "partial", ...partialResult})});
                });

                cb.recordSuccess();
                await stream.writeSSE({data: JSON.stringify({type: "complete", ...result})});
            } catch (error) {
                cb.recordFailure();
                const message = error instanceof Error ?
                    error.message :
                    "Unknown error";

                await stream.writeSSE({data: JSON.stringify({type: "error", errors: [{message, refId: requestId}]})});
            }
        });
    })
    .get("/clp/datasets", async (c) => {
        try {
            // eslint-disable-next-line dot-notation
            const tableName = settings["SqlDbClpDatasetsTableName"] ?? "clp_datasets";
            const rows = await executeMySQLQuery(
                `SELECT name FROM ${tableName} ORDER BY name`,
            );
            // eslint-disable-next-line dot-notation
            return c.json(rows.map((r) => r["name"] as string));
        } catch {
            return c.json([]);
        }
    });

/**
 *
 * @param dsType
 * @param body
 * @param body.queries
 * @param body.range
 * @param body.range.from
 * @param body.range.to
 */
async function executeDatasourceQuery (
    dsType: string,
    body: {queries: {refId: string; query: unknown; [key: string]: unknown}[]; range: {from: number; to: number}},
): Promise<{data: unknown[]; errors?: {message: string; refId?: string}[]}> {
    const {queries} = body;
    const errors: {message: string; refId?: string}[] = [];
    const allData: unknown[] = [];

    for (const query of queries) {
        try {
            switch (dsType) {
                case "mysql": {
                    const sql = String(query.query);
                    const safety = validateSqlSafety(sql);
                    if (!safety.safe) {
                        errors.push({message: safety.reason ?? "Unsafe SQL", refId: query.refId});
                        break;
                    }
                    const limit = getApplicableRowLimit(sql);
                    const limitedSql = injectLimit(sql, limit);
                    // eslint-disable-next-line dot-notation
                    const params = Array.isArray(query["params"]) ?
                        query["params"] as unknown[] :
                        undefined;
                    const rows = await executeMySQLQuery(limitedSql, undefined, params);
                    const frame = rowsToDataFrame(rows, query.refId, limit);
                    allData.push(frame);
                    break;
                }
                case "clp": {
                    // CLP queries use SSE streaming internally; for the non-streaming endpoint,
                    // we run the streaming executor and collect all partial results
                    const collectedData: unknown[] = [];
                    await executeClpQueryStreaming(
                        {
                            queryString: String(query.query),
                            datasets: Array.isArray(query["datasets"]) ?
                                query["datasets"] as string[] :
                                [],
                            ignoreCase: Boolean(query["ignoreCase"]),
                            timeRange: body.range,
                            queryType: "search",
                            refId: query.refId,
                        },
                        {
                            onPartial: async (partial) => {
                                collectedData.push(...partial.data);
                            },
                        },
                    );
                    allData.push(...collectedData);
                    break;
                }
                case "infinity": {
                    const infinityQuery = buildInfinityQuery(query);
                    const result = await executeInfinityQuery(infinityQuery, infinityAllowedHosts);
                    if (result.error) {
                        errors.push({message: result.error, refId: query.refId});
                    } else {
                        allData.push(...result.data);
                    }
                    break;
                }
                default:
                    errors.push({message: `Unknown datasource type: ${dsType}`, refId: query.refId});
            }
        } catch (error) {
            const message = error instanceof Error ?
                error.message :
                "Query execution failed";

            errors.push({message, refId: query.refId});
        }
    }

    return {data: allData,
        ...(0 < errors.length ?
            {errors} :
            {})};
}

/**
 *
 * @param dsType
 * @param body
 * @param body.queries
 * @param onPartial
 * @param body.range
 * @param body.range.from
 * @param body.range.to
 */
async function executeDatasourceQueryStreaming (
    dsType: string,
    body: {queries: {refId: string; query: unknown; [key: string]: unknown}[]; range: {from: number; to: number}},
    onPartial: (result: {data: unknown[]; errors?: {message: string; refId?: string}[]}) => Promise<void>,
): Promise<{data: unknown[]; errors?: {message: string; refId?: string}[]}> {
    const {queries} = body;
    const errors: {message: string; refId?: string}[] = [];
    const allData: unknown[] = [];

    for (const query of queries) {
        try {
            let queryData: unknown[] = [];
            switch (dsType) {
                case "mysql": {
                    const sql = String(query.query);
                    const safety = validateSqlSafety(sql);
                    if (!safety.safe) {
                        errors.push({message: safety.reason ?? "Unsafe SQL", refId: query.refId});
                        break;
                    }
                    const limit = getApplicableRowLimit(sql);
                    const limitedSql = injectLimit(sql, limit);
                    // eslint-disable-next-line dot-notation
                    const params = Array.isArray(query["params"]) ?
                        query["params"] as unknown[] :
                        undefined;
                    let totalRows = 0;
                    await executeMySQLQueryStream(limitedSql, async (rows) => {
                        totalRows += rows.length;
                        const frame = rowsToDataFrame(rows, query.refId, limit);
                        await onPartial({data: [frame]});
                    }, undefined, params);
                    // Final aggregated frame for the complete result
                    queryData = [{name: query.refId, fields: [], length: totalRows}];
                    break;
                }
                case "clp": {
                    const result = await executeClpQueryStreaming(
                        {
                            queryString: String(query.query),
                            datasets: Array.isArray(query["datasets"]) ?
                                query["datasets"] as string[] :
                                [],
                            ignoreCase: Boolean(query["ignoreCase"]),
                            timeRange: body.range,
                            queryType: "search",
                            refId: query.refId,
                        },
                        {
                            onPartial,
                        },
                    );
                    queryData = result.data;
                    break;
                }
                case "infinity": {
                    const infinityQuery = buildInfinityQuery(query);
                    const result = await executeInfinityQuery(infinityQuery, infinityAllowedHosts);
                    if (result.error) {
                        errors.push({message: result.error, refId: query.refId});
                    } else {
                        queryData = result.data;
                    }
                    break;
                }
                default:
                    errors.push({message: `Unknown datasource type: ${dsType}`, refId: query.refId});
            }

            allData.push(...queryData);
            if (0 < queryData.length) {
                await onPartial({data: queryData});
            }
        } catch (error) {
            const message = error instanceof Error ?
                error.message :
                "Query execution failed";

            errors.push({message, refId: query.refId});
            await onPartial({data: [], errors: [{message: message, refId: query.refId}]});
        }
    }

    return {data: allData,
        ...(0 < errors.length ?
            {errors} :
            {})};
}

/**
 *
 * @param sql
 * @param timeoutMs
 * @param params
 */
async function executeMySQLQuery (
    sql: string,
    timeoutMs: number = QUERY_TIMEOUTS.MYSQL_QUERY_TIMEOUT_MS,
    params?: unknown[],
): Promise<Record<string, unknown>[]> {
    // In production, this uses the @fastify/mysql connection
    // For now, use mysql2 directly with env-based config
    const {SqlDbHost: host, SqlDbPort: port, SqlDbName: database} = settings;
    // eslint-disable-next-line dot-notation
    const user = process.env["CLP_DB_USER"] ?? "clp-user";
    // eslint-disable-next-line dot-notation
    const password = process.env["CLP_DB_PASS"] ?? "";

    const mysql = await import("mysql2/promise");
    const connection = await mysql.createConnection({host, port, user, password, database});

    const timeoutId = setTimeout(() => {
        connection.destroy();
    }, timeoutMs);

    try {
    // Enforce read-only mode at connection level
        await connection.query("SET TRANSACTION READ ONLY");
        await connection.query("START TRANSACTION");
        const [rows] = params ?
            await connection.query(sql, params) :
            await connection.query(sql);
        await connection.query("COMMIT");

        return Array.isArray(rows) ?
            rows as Record<string, unknown>[] :
            [];
    } catch (error) {
        try {
            await connection.query("ROLLBACK");
        } catch {/* ignore rollback error */}
        if (error instanceof Error && error.message.includes("Connection destroyed")) {
            throw new Error(`MySQL query timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        connection.destroy();
    }
}

const STREAM_BATCH_SIZE = 50;

/**
 *
 * @param sql
 * @param onBatch
 * @param timeoutMs
 * @param params
 */
async function executeMySQLQueryStream (
    sql: string,
    onBatch: (rows: Record<string, unknown>[]) => Promise<void>,
    timeoutMs: number = QUERY_TIMEOUTS.MYSQL_QUERY_TIMEOUT_MS,
    params?: unknown[],
): Promise<void> {
    const {SqlDbHost: host, SqlDbPort: port, SqlDbName: database} = settings;
    // eslint-disable-next-line dot-notation
    const user = process.env["CLP_DB_USER"] ?? "clp-user";
    // eslint-disable-next-line dot-notation
    const password = process.env["CLP_DB_PASS"] ?? "";

    // Use callback-based mysql2 for streaming support (query().stream())
    const mysqlCb = await import("mysql2");
    const connection = mysqlCb.createConnection({host, port, user, password, database});

    const timeoutId = setTimeout(() => {
        connection.destroy();
    }, timeoutMs);

    try {
        // Set read-only mode for safety
        await new Promise<void>((resolve, reject) => {
            connection.query("SET TRANSACTION READ ONLY", (err: unknown) => {
                if (err) { reject(err); } else { resolve(); }
            });
        });
        await new Promise<void>((resolve, reject) => {
            connection.query("START TRANSACTION", (err: unknown) => {
                if (err) { reject(err); } else { resolve(); }
            });
        });

        // Use query().stream() for row-by-row streaming
        const query = connection.query(sql, params);
        const stream = query.stream();

        await new Promise<void>((resolve, reject) => {
            const batch: Record<string, unknown>[] = [];

            const flush = async () => {
                if (0 < batch.length) {
                    const rows = [...batch];
                    batch.length = 0;
                    await onBatch(rows);
                }
            };

            stream.on("data", (row: Record<string, unknown>) => {
                batch.push(row);
                if (STREAM_BATCH_SIZE === batch.length) {
                    const rows = [...batch];
                    batch.length = 0;
                    void onBatch(rows);
                }
            });
            stream.on("end", async () => {
                try {
                    await flush();
                    resolve();
                } catch (error: unknown) {
                    reject(error);
                }
            });
            stream.on("error", (error: unknown) => {
                reject(error);
            });
        });

        await new Promise<void>((resolve, reject) => {
            connection.query("COMMIT", (err: unknown) => {
                if (err) { reject(err); } else { resolve(); }
            });
        });
    } catch (error) {
        try {
            connection.query("ROLLBACK", () => {});
        } catch {/* ignore rollback error */}
        if (error instanceof Error && error.message.includes("Connection destroyed")) {
            throw new Error(`MySQL query timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        connection.destroy();
    }
}

/**
 *
 * @param dsType
 */
async function testDatasourceConnection (dsType: string): Promise<boolean> {
    switch (dsType) {
        case "mysql": {
            try {
                const rows = await executeMySQLQuery("SELECT 1 AS test");
                return 0 < rows.length;
            } catch {
                return false;
            }
        }
        case "infinity":
            return true;
        case "clp":
            return true;
        default:
            return false;
    }
}

/**
 *
 * @param query
 * @param query.refId
 * @param query.query
 */
function buildInfinityQuery (query: {refId: string; query: unknown; [key: string]: unknown}) {
    const q = query.query as Record<string, unknown>;
    const result: Record<string, unknown> = {
        refId: query.refId,
        // eslint-disable-next-line dot-notation
        type: q["type"] ?? "json",
        // eslint-disable-next-line dot-notation
        source: q["source"] ?? "url",
        // eslint-disable-next-line dot-notation
        parser: q["parser"] ?? "simple",
    };

    // eslint-disable-next-line dot-notation
    if (q["url"] !== undefined) {
        // eslint-disable-next-line dot-notation
        result["url"] = q["url"];
    }
    // eslint-disable-next-line dot-notation
    if (q["data"] !== undefined) {
        // eslint-disable-next-line dot-notation
        result["data"] = q["data"];
    }
    // eslint-disable-next-line dot-notation
    if (q["rootSelector"] !== undefined) {
        // eslint-disable-next-line dot-notation
        result["rootSelector"] = q["rootSelector"];
    }
    // eslint-disable-next-line dot-notation
    if (q["urlOptions"] !== undefined) {
        // eslint-disable-next-line dot-notation
        result["urlOptions"] = q["urlOptions"];
    }
    // eslint-disable-next-line dot-notation
    if (q["columns"] !== undefined) {
        // eslint-disable-next-line dot-notation
        result["columns"] = q["columns"];
    }
    // eslint-disable-next-line dot-notation
    if (q["pagination"] !== undefined) {
        // eslint-disable-next-line dot-notation
        result["pagination"] = q["pagination"];
    }

    return result as unknown as Parameters<typeof executeInfinityQuery>[0];
}


export type DatasourceRoutesType = typeof datasourceRoutes;
