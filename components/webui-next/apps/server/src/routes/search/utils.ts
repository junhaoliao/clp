import {SEARCH_SIGNAL} from "@clp/webui-shared";
import type {Db} from "mongodb";

import type {QueryJobDbManager} from "../../services/query-job-db-manager.js";
import {SEARCH_MAX_NUM_RESULTS} from "./constants.js";


/**
 *
 * @param mongoDb
 * @param collectionName
 */
async function hasCollection (mongoDb: Db, collectionName: string): Promise<boolean> {
    const collections = await mongoDb.listCollections({name: collectionName}).toArray();
    return 0 < collections.length;
}

/**
 *
 * @param props
 * @param props.searchJobId
 * @param props.aggregationJobId
 * @param props.queryJobDbManager
 * @param props.mongoDb
 * @param props.metadataCollectionName
 */
async function updateSearchSignalWhenJobsFinish (props: {
    searchJobId: number;
    aggregationJobId: number;
    queryJobDbManager: QueryJobDbManager;
    mongoDb: Db;
    metadataCollectionName: string;
}): Promise<void> {
    const {
        searchJobId,
        aggregationJobId,
        queryJobDbManager,
        mongoDb,
        metadataCollectionName,
    } = props;

    // Wait for both jobs to complete
    await Promise.all([
        queryJobDbManager.awaitJobCompletion(searchJobId),
        queryJobDbManager.awaitJobCompletion(aggregationJobId),
    ]);

    // Check if the collection still exists (may have been deleted)
    if (!(await hasCollection(mongoDb, String(searchJobId)))) {
        return;
    }

    // Count results
    const collection = mongoDb.collection(String(searchJobId));
    const numTotalResults = await collection.countDocuments();

    // Update metadata
    await mongoDb.collection(metadataCollectionName).updateOne(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        {_id: String(searchJobId) as any},
        {
            $set: {
                lastSignal: SEARCH_SIGNAL.RESP_DONE,
                numTotalResults: Math.min(numTotalResults, SEARCH_MAX_NUM_RESULTS),
            },
        },
    );
}

/**
 *
 * @param props
 * @param props.searchJobId
 * @param props.mongoDb
 */
async function createMongoIndexes (props: {
    searchJobId: number;
    mongoDb: Db;
}): Promise<void> {
    const {searchJobId, mongoDb} = props;
    const collection = mongoDb.collection(String(searchJobId));
    await collection.createIndex({timestamp: 1});
    await collection.createIndex({timestamp: -1});
}

export {
    createMongoIndexes,
    hasCollection,
    updateSearchSignalWhenJobsFinish,
};
