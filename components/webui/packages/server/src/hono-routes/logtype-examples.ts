import {tbValidator} from "@hono/typebox-validator";
import {
    type TSchema,
    Type,
} from "@sinclair/typebox";
import {QUERY_JOB_TYPE} from "@webui/common/query";
import {Hono} from "hono";

import {getClpQueryService} from "./clp-query-service.js";


const DEFAULT_COUNT = 3;
const HTTP_INTERNAL_ERROR = 500;
const MAX_COUNT = 50;
const WILDCARD_MAX_RESULTS = 5000;

const LogtypeExamplesQuerySchema = Type.Object({
    archive_id: Type.String({minLength: 1}),
    count: Type.Optional(Type.String()),
    dataset: Type.String({minLength: 1}),
    logtype_id: Type.String({minLength: 1}),
    logtype_template: Type.String({minLength: 1}),
});

interface LogtypeExample {
    archive_id: string;
    log_event_ix: number;
    message: string;
    timestamp: number;
}

type QueryResult = {
    archive_id?: string;
    log_event_ix?: number;
    message?: string;
    timestamp?: number;
};

/**
 * Converts a CLP-S logtype template into a regex that matches concrete log
 * messages.
 *
 * Placeholders like `%varName%` or `%var.path%` become `.+?` (non-greedy
 * wildcard). Literal portions are regex-escaped.
 *
 * @param template
 * @return RegExp matching messages conforming to the template.
 */
const logtypeTemplateToRegex = (template: string): RegExp => {
    const parts = template.split(/%[^%]+%/);
    const escaped = parts.map((p) =>
        p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    let pattern = "";
    let i = 0;
    for (const _ of template.matchAll(/%[^%]+%/g)) {
        pattern += escaped[i++];
        pattern += ".+?";
    }
    pattern += escaped[i];

    return new RegExp(`^${pattern}$`);
};

/**
 * Parses the inner message from a CLP-S search result.
 *
 * CLP-S wraps decompressed events as
 * `{"message":"actual log text","timestamp":"..."}`.
 * This function extracts the inner `message` value; if parsing fails or the
 * envelope doesn't contain a `message` key, the raw string is returned as-is.
 *
 * @param rawMessage
 * @return The actual log message text.
 */
const parseInnerMessage = (rawMessage: string): string => {
    try {
        const parsed: unknown = JSON.parse(rawMessage);
        if ("object" === typeof parsed && null !== parsed) {
            const obj = parsed as Record<string, unknown>;
            if ("string" === typeof obj["message"]) {
                return obj["message"];
            }
        }

        return rawMessage;
    } catch {
        return rawMessage;
    }
};

/**
 * Maps raw MongoDB documents to LogtypeExample objects.
 *
 * @param docs
 * @return Logtype examples.
 */
const mapToExamples = (docs: QueryResult[]): LogtypeExample[] => docs.map((doc) => ({
    archive_id: doc.archive_id ?? "",
    log_event_ix: doc.log_event_ix ?? 0,
    message: doc.message ?? "",
    timestamp: doc.timestamp ?? 0,
}));


export const logtypeExamplesRoutes = new Hono()
    .get(
        "/",
        tbValidator("query", LogtypeExamplesQuerySchema as unknown as TSchema),
        async (c) => {
            const raw = c.req.valid("query") as {
                archive_id: string;
                count?: string;
                dataset: string;
                logtype_id: string;
                logtype_template: string;
            };

            let count = DEFAULT_COUNT;
            if (undefined !== raw.count) {
                const parsed = parseInt(raw.count, 10);
                if (Number.isNaN(parsed) || parsed < 1 || parsed > MAX_COUNT) {
                    return c.json(
                        {error: `count must be an integer between 1 and ${MAX_COUNT}`},
                        400,
                    );
                }
                count = parsed;
            }

            const {archive_id: archiveId, dataset, logtype_template: logtypeTemplate} = raw;
            const logtypeId = parseInt(raw.logtype_id, 10);
            if (Number.isNaN(logtypeId) || logtypeId < 0) {
                return c.json(
                    {error: "logtype_id must be a non-negative integer"},
                    400,
                );
            }

            const templateRegex = logtypeTemplateToRegex(logtypeTemplate);

            const {queryJobDbManager, mongoDb} = getClpQueryService();

            // Submit a wildcard search — logtype_id KQL queries are broken at
            // the C++ level, so we filter server-side instead.
            const jobId = await queryJobDbManager.submitJob(
                {
                    begin_timestamp: null,
                    datasets: [dataset],
                    end_timestamp: null,
                    ignore_case: false,
                    max_num_results: WILDCARD_MAX_RESULTS,
                    query_string: "*",
                },
                QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION,
            );

            await mongoDb.createCollection(jobId.toString());

            try {
                await queryJobDbManager.awaitJobCompletion(jobId);
            } catch (err: unknown) {
                const msg = err instanceof Error ?
                    err.message :
                    "Logtype examples job failed";

                if (false === msg.includes("unexpected status")) {
                    try {
                        await mongoDb.collection(jobId.toString()).drop();
                    } catch {
                        // Ignore cleanup errors
                    }

                    return c.json({error: msg}, HTTP_INTERNAL_ERROR);
                }
            }

            // Match results against the logtype template regex.
            // We don't filter by archive_id because the wildcard search may not
            // return results from every archive (results are ordered by archive
            // and max_num_results may be consumed by a single large archive).
            // The same logtype template represents the same pattern regardless
            // of which archive produced it.
            const collection = mongoDb.collection(jobId.toString());
            const allDocs = await collection
                .find({})
                .toArray();

            const matching: QueryResult[] = [];
            for (const doc of allDocs as QueryResult[]) {
                const msg = parseInnerMessage(doc.message ?? "");
                if (templateRegex.test(msg)) {
                    matching.push({...doc, message: msg});
                }
                if (matching.length >= count) {
                    break;
                }
            }

            try {
                await collection.drop();
            } catch {
                // Ignore cleanup errors
            }

            return c.json({
                archive_id: archiveId,
                dataset: dataset,
                examples: mapToExamples(matching),
                logtype_id: logtypeId,
            });
        },
    );

export type LogtypeExamplesRoutesType = typeof logtypeExamplesRoutes;
