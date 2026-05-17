import {tbValidator} from "@hono/typebox-validator";
import {
    type TSchema,
    Type,
} from "@sinclair/typebox";
import {QUERY_JOB_TYPE} from "@webui/common/query";
import {Hono} from "hono";

import {getClpQueryService} from "./clp-query-service.js";


const HTTP_INTERNAL_ERROR = 500;

const LogtypeStatsQuerySchema = Type.Object({
    dataset: Type.String({minLength: 1}),
});


export const logtypeStatsRoutes = new Hono()
    .get(
        "/",
        tbValidator("query", LogtypeStatsQuerySchema as unknown as TSchema),
        async (c) => {
            const {dataset} = c.req.valid("query") as {dataset: string};

            const {queryJobDbManager, mongoDb} = getClpQueryService();

            let jobId: number;
            try {
                jobId = await queryJobDbManager.submitJob(
                    {dataset},
                    QUERY_JOB_TYPE.LOGTYPE_STATS,
                );
            } catch (err: unknown) {
                const msg = err instanceof Error ?
                    err.message :
                    "Failed to submit logtype stats job";

                return c.json({error: msg}, HTTP_INTERNAL_ERROR);
            }

            // Create the MongoDB collection for results
            await mongoDb.createCollection(jobId.toString());

            try {
                await queryJobDbManager.awaitJobCompletion(jobId);
            } catch (err: unknown) {
                // Tolerate partial failures — some archives may lack CLPP
                // metadata (e.g., compressed with standard CLP). We still
                // read whatever results the successful tasks produced.
                const msg = err instanceof Error ?
                    err.message :
                    "Logtype stats job failed";

                if (false === msg.includes("unexpected status")) {
                    // Not a partial-failure — clean up and re-throw.
                    try {
                        await mongoDb.collection(jobId.toString()).drop();
                    } catch {
                        // Ignore cleanup errors
                    }

                    return c.json({error: msg}, HTTP_INTERNAL_ERROR);
                }
            }

            // Read results from MongoDB, excluding schema tree marker documents
            const collection = mongoDb.collection(jobId.toString());
            const results = await collection.find({_schema_tree: {$ne: true}}).toArray();

            // Clean up the collection after reading
            try {
                await collection.drop();
            } catch {
                // Ignore cleanup errors
            }

            return c.json({
                jobId: jobId,
                logtypes: results,
                totalCount: results.reduce<number>((sum, r) => sum + (r["count"] as number), 0),
            });
        },
    );

export type LogtypeStatsRoutesType = typeof logtypeStatsRoutes;
