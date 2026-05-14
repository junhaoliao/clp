import {tbValidator} from "@hono/typebox-validator";
import {
    type TSchema,
    Type,
} from "@sinclair/typebox";
import {QUERY_JOB_TYPE} from "@webui/common/query";
import {Hono} from "hono";

import {getClpQueryService} from "./clp-query-service.js";


const SchemaTreeQuerySchema = Type.Object({
    dataset: Type.String({minLength: 1}),
});


/**
 * Builds a schema tree from logtype stats documents.
 *
 * Each logtype document from `clp-s s stats.logtypes` contains variable info
 * that we use to construct the tree. Variables at the same position across
 * logtypes form sibling nodes under the same parent key (the variable index).
 *
 * @param logtypeDocs Raw documents from the MongoDB collection
 * @return Schema tree root node
 */
export const buildSchemaTree = (logtypeDocs: Record<string, unknown>[]) => {
    // Group variables by position to find shared nodes
    const variablesByPosition: Map<number, Map<string, number>> = new Map();

    for (const doc of logtypeDocs) {
        const variables = doc["variables"] as Array<{index: number; type: string}> | undefined;
        if (!variables) {
            continue;
        }

        for (const v of variables) {
            if (!variablesByPosition.has(v.index)) {
                variablesByPosition.set(v.index, new Map());
            }
            const typeMap = variablesByPosition.get(v.index)!;
            typeMap.set(v.type, (typeMap.get(v.type) ?? 0) + 1);
        }
    }

    const children = [];
    for (const [index, typeMap] of variablesByPosition) {
        for (const [type, count] of typeMap) {
            children.push({
                children: [],
                count,
                id: `var-${index}-${type}`,
                key: String(index),
                type,
            });
        }
    }

    return {
        children,
        count: logtypeDocs.length,
        id: "root",
        key: "root",
        type: "object",
    };
};


export const schemaTreeRoutes = new Hono()
    .get(
        "/",
        tbValidator("query", SchemaTreeQuerySchema as unknown as TSchema),
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

                return c.json({error: msg}, 500);
            }

            // Create the MongoDB collection for results
            await mongoDb.createCollection(jobId.toString());

            try {
                await queryJobDbManager.awaitJobCompletion(jobId);
            } catch (err: unknown) {
                const msg = err instanceof Error ?
                    err.message :
                    "Logtype stats job failed";

                try {
                    await mongoDb.collection(jobId.toString()).drop();
                } catch {
                    // Ignore cleanup errors
                }

                return c.json({error: msg}, 500);
            }

            // Read results from MongoDB
            const collection = mongoDb.collection(jobId.toString());
            const results = await collection.find({}).toArray();

            // Clean up the collection after reading
            try {
                await collection.drop();
            } catch {
                // Ignore cleanup errors
            }

            return c.json({
                dataset,
                tree: buildSchemaTree(results),
            });
        },
    );

export type SchemaTreeRoutesType = typeof schemaTreeRoutes;
