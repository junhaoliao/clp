import {setTimeout} from "node:timers/promises";

import {CLP_DEFAULT_DATASET_NAME} from "@webui/common/config";
import type {SearchResultsMetadataDocument} from "@webui/common/metadata";
import {SEARCH_SIGNAL} from "@webui/common/metadata";
import {QUERY_JOB_TYPE} from "@webui/common/query";
import {
    clpAggregationToDataFrame,
    clpDocumentsToDataFrame,
} from "@webui/datasource/clp";
import type {
    Collection,
    Db,
    Filter as MongoFilter,
    ObjectId,
} from "mongodb";

import {getClpQueryService} from "./clp-query-service.js";


const POLL_INTERVAL_MS = 500;
const POLL_BATCH_SIZE = 100;
const SEARCH_MAX_NUM_RESULTS = 1000;

/** MongoDB document type (avoid DOM Document collision) */
type MongoDoc = Record<string, unknown>;

interface ClpQueryOptions {
    queryString: string;
    datasets: string[];
    ignoreCase: boolean;
    timeRange: {from: number; to: number};
    queryType: "search" | "aggregate";
    refId: string;
    timeRangeBucketSizeMillis?: number;
}

export interface ClpStreamCallbacks {
    onPartial: (result: {data: unknown[]}) => Promise<void>;
    signal?: AbortSignal;
}

/**
 * Submits CLP search/aggregation jobs and streams partial DataFrames as results arrive.
 *
 * The flow:
 * 1. Submit search + aggregation jobs via QueryJobDbManager
 * 2. Create MongoDB collections for results
 * 3. Insert metadata document tracking job status
 * 4. Poll MongoDB incrementally for new results, emitting partial DataFrames
 * 5. Detect job completion via metadata document's lastSignal
 * 6. Cancel jobs and clean up on abort
 *
 * @param opts
 * @param callbacks
 */
export async function executeClpQueryStreaming (
    opts: ClpQueryOptions,
    callbacks: ClpStreamCallbacks,
): Promise<{data: unknown[]; searchJobId: number; aggregationJobId: number}> {
    const service = getClpQueryService();
    const {queryJobDbManager, mongoDb, queryEngine, metadataCollectionName} = service;

    const isSearch = "aggregate" !== opts.queryType;

    // Build job args matching the Python SearchJobConfig shape
    // CLP query scheduler requires non-null datasets; use default dataset when none specified
    const datasets = 0 < opts.datasets.length ?
        opts.datasets :
        [CLP_DEFAULT_DATASET_NAME];

    const args = {
        begin_timestamp: opts.timeRange.from,
        datasets,
        end_timestamp: opts.timeRange.to,
        ignore_case: opts.ignoreCase,
        max_num_results: SEARCH_MAX_NUM_RESULTS,
        query_string: opts.queryString,
    };

    // Submit search job
    const searchJobId = await queryJobDbManager.submitJob(
        args,
        QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION,
    );

    // Submit aggregation job (always submitted for metadata tracking)
    const bucketSize = opts.timeRangeBucketSizeMillis ??
    computeTimeRangeBucketSize(opts.timeRange);
    const aggregationJobId = await queryJobDbManager.submitJob(
        {
            ...args,
            aggregation_config: {
                count_by_time_bucket_size: bucketSize,
            },
        },
        QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION,
    );

    // Create MongoDB collections for results
    await mongoDb.createCollection(searchJobId.toString());
    await mongoDb.createCollection(aggregationJobId.toString());

    // Insert metadata document
    const metadataCollection = mongoDb.collection<SearchResultsMetadataDocument>(metadataCollectionName);
    await metadataCollection.insertOne({
        _id: searchJobId.toString(),
        errorMsg: null,
        errorName: null,
        lastSignal: SEARCH_SIGNAL.RESP_QUERYING,
        queryEngine,
    });

    // Fire signal update in background — polls MySQL until jobs complete, then updates metadata
    updateSearchSignalWhenJobsFinish(
        queryJobDbManager,
        mongoDb,
        metadataCollection,
        searchJobId,
        aggregationJobId,
    ).catch(() => {
    // Best effort — errors handled internally
    });

    // Create indexes for the search results collection
    const searchCollection = mongoDb.collection(searchJobId.toString());
    await searchCollection.createIndexes([
        {key: {timestamp: 1, _id: 1}, name: "timestamp-ascending"},
        {key: {timestamp: -1, _id: -1}, name: "timestamp-descending"},
    ]);

    // Poll loop — read new documents incrementally and emit partial DataFrames
    const resultCollectionName = isSearch ?
        searchJobId.toString() :
        aggregationJobId.toString();
    const resultCollection = mongoDb.collection(resultCollectionName);

    let lastSeenId: ObjectId | null = null;
    let totalDocs = 0;
    const allData: unknown[] = [];

    try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
            // Check for abort
            if (callbacks.signal?.aborted) {
                await cancelClpQuery(queryJobDbManager, mongoDb, metadataCollection, searchJobId, aggregationJobId);
                throw new DOMException("Query cancelled", "AbortError");
            }

            // Check metadata for job completion
            const metadata = await metadataCollection.findOne({
                _id: searchJobId.toString(),
            });
            const isDone = metadata?.lastSignal === SEARCH_SIGNAL.RESP_DONE;
            const errorMsg = metadata?.errorMsg;

            // Fetch new documents from result collection
            const filter: MongoFilter<MongoDoc> = lastSeenId ?
                {_id: {$gt: lastSeenId}} :
                {};
            const newDocs = await resultCollection
                .find(filter as unknown as MongoFilter<import("mongodb").Document>)
                .sort({_id: 1})
                .limit(POLL_BATCH_SIZE)
                .toArray();

            if (0 < newDocs.length) {
                lastSeenId = newDocs[newDocs.length - 1]!._id;
                totalDocs += newDocs.length;

                // Convert to DataFrame
                let frame: unknown;
                if (isSearch) {
                    frame = clpDocumentsToDataFrame(
                        newDocs as unknown as Parameters<typeof clpDocumentsToDataFrame>[0],
                        opts.refId,
                        queryEngine,
                        SEARCH_MAX_NUM_RESULTS,
                    );
                } else {
                    frame = clpAggregationToDataFrame(
                        newDocs as unknown as Parameters<typeof clpAggregationToDataFrame>[0],
                        opts.refId,
                    );
                }

                await callbacks.onPartial({data: [frame]});
                allData.push(frame);
            }

            // If job is done, do one final poll for any remaining docs, then break
            if (isDone) {
                if (errorMsg) {
                    throw new Error(errorMsg);
                }

                // Final poll — drain any remaining documents
                let moreDocs = true;
                while (moreDocs) {
                    const remainingFilter: MongoFilter<MongoDoc> = lastSeenId ?
                        {_id: {$gt: lastSeenId}} :
                        {};
                    const remainingDocs = await resultCollection
                        .find(remainingFilter as unknown as MongoFilter<import("mongodb").Document>)
                        .sort({_id: 1})
                        .limit(POLL_BATCH_SIZE)
                        .toArray();

                    if (0 === remainingDocs.length) {
                        moreDocs = false;
                        break;
                    }

                    lastSeenId = remainingDocs[remainingDocs.length - 1]!._id;
                    totalDocs += remainingDocs.length;

                    let frame: unknown;
                    if (isSearch) {
                        frame = clpDocumentsToDataFrame(
                            remainingDocs as unknown as Parameters<typeof clpDocumentsToDataFrame>[0],
                            opts.refId,
                            queryEngine,
                            SEARCH_MAX_NUM_RESULTS,
                        );
                    } else {
                        frame = clpAggregationToDataFrame(
                            remainingDocs as unknown as Parameters<typeof clpAggregationToDataFrame>[0],
                            opts.refId,
                        );
                    }

                    await callbacks.onPartial({data: [frame]});
                    allData.push(frame);

                    if (totalDocs >= SEARCH_MAX_NUM_RESULTS) {
                        moreDocs = false;
                    }
                }

                break;
            }

            // If we've hit the max results limit, stop polling
            if (totalDocs >= SEARCH_MAX_NUM_RESULTS) {
                break;
            }

            // Wait before next poll
            await setTimeout(POLL_INTERVAL_MS);
        }
    } catch (error) {
        if (!(error instanceof DOMException && "AbortError" === error.name)) {
            // On unexpected error, attempt cleanup
            await cancelClpQuery(queryJobDbManager, mongoDb, metadataCollection, searchJobId, aggregationJobId);
        }
        throw error;
    }

    return {data: allData, searchJobId, aggregationJobId};
}

/**
 * Cancels CLP search/aggregation jobs and drops result collections.
 *
 * @param queryJobDbManager
 * @param mongoDb
 * @param metadataCollection
 * @param searchJobId
 * @param aggregationJobId
 */
export async function cancelClpQuery (
    queryJobDbManager: ReturnType<typeof getClpQueryService>["queryJobDbManager"],
    mongoDb: Db,
    metadataCollection: Collection<SearchResultsMetadataDocument>,
    searchJobId: number,
    aggregationJobId: number,
): Promise<void> {
    try {
        await queryJobDbManager.cancelJob(searchJobId);
    } catch {
    // Job may already be complete
    }
    try {
        await queryJobDbManager.cancelJob(aggregationJobId);
    } catch {
    // Job may already be complete
    }

    try {
        await metadataCollection.updateOne(
            {
                _id: searchJobId.toString(),
                lastSignal: SEARCH_SIGNAL.RESP_QUERYING,
            },
            {
                $set: {
                    errorMsg: "Query cancelled before it could be completed.",
                    lastSignal: SEARCH_SIGNAL.RESP_DONE,
                },
            },
        );
    } catch {
    // Metadata may already be updated
    }

    try {
        await mongoDb.collection(searchJobId.toString()).drop();
    } catch {
    // Collection may not exist
    }
    try {
        await mongoDb.collection(aggregationJobId.toString()).drop();
    } catch {
    // Collection may not exist
    }
}

/**
 * Polls MySQL until both jobs complete, then updates the metadata document.
 * Mirrors the existing updateSearchSignalWhenJobsFinish in search/utils.ts
 * but without Fastify logger dependency.
 *
 * @param queryJobDbManager
 * @param mongoDb
 * @param metadataCollection
 * @param searchJobId
 * @param aggregationJobId
 */
async function updateSearchSignalWhenJobsFinish (
    queryJobDbManager: ReturnType<typeof getClpQueryService>["queryJobDbManager"],
    mongoDb: Db,
    metadataCollection: Collection<SearchResultsMetadataDocument>,
    searchJobId: number,
    aggregationJobId: number,
): Promise<void> {
    let errorMsg: string | null = null;

    try {
        await queryJobDbManager.awaitJobCompletion(searchJobId);
        await queryJobDbManager.awaitJobCompletion(aggregationJobId);
    } catch (e: unknown) {
        errorMsg = e instanceof Error ?
            e.message :
            "Error while waiting for job completion";
    }

    const searchResultCollectionName = searchJobId.toString();
    let numResultsInCollection = 0;

    try {
        numResultsInCollection = await mongoDb.collection(searchResultCollectionName).countDocuments();
    } catch {
    // Collection may have been dropped
        return;
    }

    await metadataCollection.updateOne(
        {
            _id: searchJobId.toString(),
            lastSignal: SEARCH_SIGNAL.RESP_QUERYING,
        },
        {
            $set: {
                lastSignal: SEARCH_SIGNAL.RESP_DONE,
                errorMsg,
                numTotalResults: Math.min(numResultsInCollection, SEARCH_MAX_NUM_RESULTS),
            },
        },
    );
}

/**
 * Computes a reasonable time bucket size for aggregation queries.
 * Aims for ~40 buckets across the time range.
 *
 * @param range
 * @param range.from
 * @param range.to
 */
function computeTimeRangeBucketSize (range: {from: number; to: number}): number {
    const spanMs = range.to - range.from;
    return Math.max(1000, Math.floor(spanMs / 40));
}
