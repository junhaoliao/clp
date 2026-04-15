import {
    QUERY_JOB_TYPE,
    queryJobCreationSchema,
    SEARCH_SIGNAL,
} from "@clp/webui-shared";
import {
    createRoute,
    OpenAPIHono,
    z,
} from "@hono/zod-openapi";

import type {Env} from "../env.js";
import type {QueryJobDbManager} from "../services/query-job-db-manager.js";
import {SEARCH_MAX_NUM_RESULTS} from "./search/constants.js";
import {
    createMongoIndexes,
    updateSearchSignalWhenJobsFinish,
} from "./search/utils.js";


const HTTP_STATUS_OK = 200;
const HTTP_STATUS_NO_CONTENT = 204;


/**
 * Resolves datasets by looking up available datasets from the DB if none are provided.
 *
 * @param datasets
 */
async function resolveDatasets (datasets: string[]): Promise<string[]> {
    if (0 < datasets.length) {
        return datasets;
    }

    const {pool} = await import("../db/index.js");
    const [rows] = await pool.execute(
        "SELECT `name` FROM `clp_datasets`",
    );

    return (rows as Array<{name: string}>).map((r) => r.name);
}

/**
 * Submits both search and aggregation jobs.
 *
 * @param queryJobDbManager
 * @param params
 * @param params.ignoreCase
 * @param params.queryString
 * @param params.resolvedDatasets
 * @param params.timeRangeBucketSizeMillis
 * @param params.timestampBegin
 * @param params.timestampEnd
 */
async function submitSearchAndAggregationJobs (
    queryJobDbManager: QueryJobDbManager,
    params: {
        ignoreCase: boolean;
        queryString: string;
        resolvedDatasets: string[];
        timeRangeBucketSizeMillis: number;
        timestampBegin: number;
        timestampEnd: number;
    },
): Promise<{searchJobId: number; aggregationJobId: number}> {
    const {
        ignoreCase,
        queryString,
        resolvedDatasets,
        timeRangeBucketSizeMillis,
        timestampBegin,
        timestampEnd,
    } = params;

    const queryArgs = {
        begin_timestamp: timestampBegin,
        datasets: 0 < resolvedDatasets.length ?
            resolvedDatasets :
            null,
        end_timestamp: timestampEnd,
        ignore_case: ignoreCase,
        max_num_results: SEARCH_MAX_NUM_RESULTS,
        query_string: queryString,
    };

    // Submit search job
    const searchJobId = await queryJobDbManager.submitJob(
        queryArgs,
        QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION,
    );

    // Submit aggregation job
    const aggregationJobId = await queryJobDbManager.submitJob(
        {
            ...queryArgs,
            aggregation_config: {
                count_by_time_bucket_size: timeRangeBucketSizeMillis,
            },
        },
        QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION,
    );

    return {aggregationJobId, searchJobId};
}


const searchRoutes = new OpenAPIHono<Env>()
    .openapi(
        createRoute({
            method: "post",
            path: "/query",
            request: {
                body: {
                    content: {
                        "application/json": {schema: queryJobCreationSchema},
                    },
                },
            },
            responses: {
                200: {
                    content: {
                        "application/json": {
                            schema: z.object({
                                searchJobId: z.number(),
                                aggregationJobId: z.number(),
                            }),
                        },
                    },
                    description: "Query submitted",
                },
            },
        }),
        async (c) => {
            const {queryJobDbManager, mongoDb} = c.var;
            const {
                datasets,
                ignoreCase,
                queryString,
                timeRangeBucketSizeMillis,
                timestampBegin,
                timestampEnd,
            } = c.req.valid("json");

            const settings = (await import("../lib/config.js")).default;

            const resolvedDatasets = await resolveDatasets(datasets);

            const {searchJobId, aggregationJobId} = await submitSearchAndAggregationJobs(
                queryJobDbManager,
                // eslint-disable-next-line object-shorthand
                {
                    ignoreCase,
                    queryString,
                    timestampBegin: timestampBegin ?? 0,
                    timestampEnd: timestampEnd ?? Date.now(),
                    timeRangeBucketSizeMillis,
                    resolvedDatasets,
                },
            );

            // Create MongoDB collections
            await mongoDb.createCollection(String(searchJobId));
            await mongoDb.createCollection(String(aggregationJobId));

            // Insert metadata (use string _id)
            const metadataCollection = mongoDb.collection(
                settings.MongoDbSearchResultsMetadataCollectionName,
            );

            await metadataCollection.insertOne({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                _id: String(searchJobId) as any,
                aggregationJobId: String(aggregationJobId),
                errorMsg: null,
                errorName: null,
                lastSignal: SEARCH_SIGNAL.RESP_QUERYING,
                queryEngine: settings.ClpQueryEngine,
            });

            // Create indexes (fire-and-forget)
            createMongoIndexes({
                searchJobId,
                mongoDb,
            }).catch(() => {
            });

            // Fire-and-forget: update signal when jobs finish
            updateSearchSignalWhenJobsFinish({
                aggregationJobId: aggregationJobId,
                metadataCollectionName: settings.MongoDbSearchResultsMetadataCollectionName,
                mongoDb: mongoDb,
                queryJobDbManager: queryJobDbManager,
                searchJobId: searchJobId,
            }).catch(() => {
            });

            return c.json({searchJobId, aggregationJobId} as const, HTTP_STATUS_OK);
        },
    )
    .openapi(
        createRoute({
            method: "delete",
            path: "/results",
            request: {
                body: {
                    content: {
                        "application/json": {
                            schema: z.object({
                                searchJobId: z.string(),
                                aggregationJobId: z.string(),
                            }),
                        },
                    },
                },
            },
            responses: {
                204: {description: "Results cleared"},
            },
        }),
        async (c) => {
            const {mongoDb} = c.var;
            const {searchJobId, aggregationJobId} = c.req.valid("json");

            await mongoDb.dropCollection(searchJobId).catch(() => {
            });
            await mongoDb.dropCollection(aggregationJobId).catch(() => {
            });

            return c.body(null, HTTP_STATUS_NO_CONTENT);
        },
    )
    .openapi(
        createRoute({
            method: "post",
            path: "/cancel",
            request: {
                body: {
                    content: {
                        "application/json": {
                            schema: z.object({
                                searchJobId: z.number(),
                                aggregationJobId: z.number(),
                            }),
                        },
                    },
                },
            },
            responses: {
                204: {description: "Jobs cancelled"},
            },
        }),
        async (c) => {
            const {queryJobDbManager, mongoDb} = c.var;
            const {searchJobId, aggregationJobId} = c.req.valid("json");

            await queryJobDbManager.cancelJob(searchJobId);
            await queryJobDbManager.cancelJob(aggregationJobId);

            const settings = (await import("../lib/config.js")).default;
            await mongoDb.collection(settings.MongoDbSearchResultsMetadataCollectionName)
                .updateOne(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                    {_id: String(searchJobId) as any},
                    {
                        $set: {
                            lastSignal: SEARCH_SIGNAL.RESP_DONE,
                            errorMsg: "Query cancelled by user.",
                        },
                    },
                );

            return c.body(null, HTTP_STATUS_NO_CONTENT);
        },
    );

export {searchRoutes};
