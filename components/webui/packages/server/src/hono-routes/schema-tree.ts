import {tbValidator} from "@hono/typebox-validator";
import {
    type TSchema,
    Type,
} from "@sinclair/typebox";
import {QUERY_JOB_TYPE} from "@webui/common/query";
import {Hono} from "hono";

import {getClpQueryService} from "./clp-query-service.js";


const HTTP_INTERNAL_ERROR = 500;

const SchemaTreeQuerySchema = Type.Object({
    dataset: Type.String({minLength: 1}),
});

// Mapping from C++ NodeType (uint8_t) to frontend type strings.
// See NodeType enum in components/core/src/clp_s/SchemaTree.hpp.
const NODE_TYPE_MAP: Record<number, string> = {
    0: "int", // Integer
    1: "float", // Float
    2: "string", // ClpString
    3: "string", // VarString
    4: "string", // Boolean (rendered as string in UI)
    5: "object", // Object
    6: "object", // UnstructuredArray
    7: "string", // NullValue
    8: "string", // DeprecatedDateString
    9: "object", // StructuredArray
    10: "object", // Metadata
    11: "int", // DeltaInteger
    12: "float", // FormattedFloat
    13: "float", // DictionaryFloat
    14: "string", // Timestamp
    100: "string", // LogMessage
    101: "string", // LogType
    102: "int", // LogTypeID
    103: "object", // ParentRule
};


/**
 * Builds a schema tree from logtype stats documents.
 *
 * If a `_schema_tree` marker document is present (produced by `clp-s s stats.schema_tree`),
 * reconstructs the tree from the serialized node list. Otherwise falls back to the old
 * variable-position-based approach (which produces an empty tree when variable data is unavailable).
 *
 * @param logtypeDocs Raw documents from the MongoDB collection
 * @return Schema tree root node
 */
export const buildSchemaTree = (logtypeDocs: Record<string, unknown>[]) => {
    // Check for schema tree marker documents. Multiple archives may each
    // produce one; pick the one with the most nodes (from a CLPP archive).
    const schemaTreeDocs = logtypeDocs.filter(
        (doc) => true === doc["_schema_tree"],
    ) as Array<{nodes?: Array<{
        id: number;
        parentId: number;
        key: string;
        type: number;
        count: number;
        children: number[];
    }>}>;

    let schemaTreeDoc: (typeof schemaTreeDocs)[number] | undefined;
    for (const doc of schemaTreeDocs) {
        if (doc.nodes && doc.nodes.length > 0) {
            if (!schemaTreeDoc || doc.nodes.length > (schemaTreeDoc.nodes?.length ?? 0)) {
                schemaTreeDoc = doc;
            }
        }
    }

    if (schemaTreeDoc?.nodes && 0 < schemaTreeDoc.nodes.length) {
        // NodeType 102 = LogTypeID (internal dictionary IDs, not user-facing).
        // Per design doc §9.2, these should not appear in field lists.
        const LOGTYPE_ID_NODE_TYPE = 102;
        const excludedIds = new Set<number>();

        for (const raw of schemaTreeDoc.nodes) {
            if (LOGTYPE_ID_NODE_TYPE === raw.type) {
                excludedIds.add(raw.id);
            }
        }

        // Reconstruct tree from serialized nodes, excluding LogTypeID nodes
        const nodeMap = new Map<number, SchemaTreeNode>();
        const childrenMap = new Map<number, SchemaTreeNode[]>();
        const rootIds: number[] = [];

        for (const raw of schemaTreeDoc.nodes) {
            if (excludedIds.has(raw.id)) {
                continue;
            }

            const node: SchemaTreeNode = {
                children: [],
                count: raw.count,
                id: `var-${raw.id}-${raw.type}`,
                key: raw.key,
                type: NODE_TYPE_MAP[raw.type] ?? "object",
            };

            nodeMap.set(raw.id, node);
            if (-1 === raw.parentId) {
                rootIds.push(raw.id);
            }
        }

        // Build parent-child relationships, skipping excluded parents
        for (const raw of schemaTreeDoc.nodes) {
            if (-1 === raw.parentId || excludedIds.has(raw.id)) {
                continue;
            }

            const node = nodeMap.get(raw.id);
            if (!node) {
                continue;
            }

            if (!childrenMap.has(raw.parentId)) {
                childrenMap.set(raw.parentId, []);
            }
            childrenMap.get(raw.parentId)!.push(node);
        }

        // Assign children to nodes, pruning object-type nodes that have no
        // children after LogTypeID exclusion
        for (const [parentId, children] of childrenMap) {
            const parentNode = nodeMap.get(parentId);
            if (parentNode) {
                parentNode.children = children;
            }
        }

        // Prune empty object nodes whose only children were LogTypeID nodes
        const pruneEmptyObjects = (node: SchemaTreeNode): boolean => {
            node.children = node.children.filter((child) => pruneEmptyObjects(child));
            return !("object" === node.type && 0 === node.children.length);
        };

        // Assign children and prune
        for (const rootId of rootIds) {
            const rootNode = nodeMap.get(rootId);
            if (rootNode) {
                pruneEmptyObjects(rootNode);
            }
        }

        // Handle multiple root nodes by creating a synthetic root
        if (1 === rootIds.length) {
            const rootNode = nodeMap.get(rootIds[0]!);
            if (rootNode) {
                return rootNode;
            }
        } else if (1 < rootIds.length) {
            return {
                children: rootIds
                    .map((id) => nodeMap.get(id))
                    .filter((n): n is SchemaTreeNode => undefined !== n),
                count: 0,
                id: "root",
                key: "root",
                type: "object",
            };
        }
    }

    // Fallback: old variable-position-based approach (produces empty tree)
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


interface SchemaTreeNode {
    children: SchemaTreeNode[];
    count: number;
    id: string;
    key: string;
    type: string;
}


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

            // Read results from MongoDB
            const collection = mongoDb.collection(jobId.toString());
            const results = await collection.find({}).toArray();

            try {
                await collection.drop();
            } catch {
                // Ignore cleanup errors
            }

            return c.json({
                dataset: dataset,
                tree: buildSchemaTree(results),
            });
        },
    );

export type SchemaTreeRoutesType = typeof schemaTreeRoutes;
