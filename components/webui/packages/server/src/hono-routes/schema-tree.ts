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
        const LOGTYPE_ID_NODE_TYPE = 102;

        // Step 1: Build logtype dictionary ID → total event count map from
        // logtype stat documents (those WITHOUT the _schema_tree marker).
        const logtypeCountMap = new Map<number, number>();
        for (const doc of logtypeDocs) {
            if (true === doc["_schema_tree"]) {
                continue;
            }
            const id = doc["id"] as number | undefined;
            const count = doc["count"] as number | undefined;
            if (undefined !== id && undefined !== count) {
                logtypeCountMap.set(id, (logtypeCountMap.get(id) ?? 0) + count);
            }
        }

        const hasLogtypeStats = 0 < logtypeCountMap.size;

        // Step 2: Identify LogTypeID nodes (still excluded from final output,
        // but kept temporarily as bridges between tree nodes and event counts).
        const logtypeIdNodeIds = new Set<number>();
        for (const raw of schemaTreeDoc.nodes) {
            if (LOGTYPE_ID_NODE_TYPE === raw.type) {
                logtypeIdNodeIds.add(raw.id);
            }
        }

        // Build node map including ALL nodes (LogTypeID nodes kept
        // temporarily for count propagation).
        const nodeMap = new Map<number, SchemaTreeNode>();
        const rootIds: number[] = [];

        for (const raw of schemaTreeDoc.nodes) {
            const node: SchemaTreeNode = {
                children: [],
                // Use 0 when logtype stats are available (we'll propagate
                // real counts); fall back to raw.count for backward compat.
                count: hasLogtypeStats ? 0 : raw.count,
                id: `var-${raw.id}-${raw.type}`,
                key: raw.key,
                type: NODE_TYPE_MAP[raw.type] ?? "object",
            };
            nodeMap.set(raw.id, node);
            if (-1 === raw.parentId) {
                rootIds.push(raw.id);
            }
        }

        // Build parent-child relationships for ALL nodes
        const childrenMap = new Map<number, SchemaTreeNode[]>();
        for (const raw of schemaTreeDoc.nodes) {
            if (-1 === raw.parentId) {
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

        for (const [parentId, children] of childrenMap) {
            const parentNode = nodeMap.get(parentId);
            if (parentNode) {
                parentNode.children = children;
            }
        }

        // Step 3: Assign actual event counts to LogTypeID nodes from
        // logtype stats. Their key is the string-formatted logtype
        // dictionary ID (e.g., "42").
        if (hasLogtypeStats) {
            for (const logtypeIdNodeId of logtypeIdNodeIds) {
                const node = nodeMap.get(logtypeIdNodeId);
                if (!node) {
                    continue;
                }
                const logtypeDictId = parseInt(node.key, 10);
                if (Number.isNaN(logtypeDictId)) {
                    continue;
                }
                node.count = logtypeCountMap.get(logtypeDictId) ?? 0;
            }

            // Step 4: Propagate event counts upward via post-order traversal.
            // Each internal node's count = sum of children's counts.
            const propagateCountsUp = (node: SchemaTreeNode): number => {
                if (0 === node.children.length) {
                    return node.count;
                }
                let total = 0;
                for (const child of node.children) {
                    total += propagateCountsUp(child);
                }
                node.count = total;

                return total;
            };

            for (const rootId of rootIds) {
                const rootNode = nodeMap.get(rootId);
                if (rootNode) {
                    propagateCountsUp(rootNode);
                }
            }
        }

        // Step 5: Remove LogTypeID nodes from parents' children arrays.
        const logtypeIdNodeSet = new Set<SchemaTreeNode>();
        for (const logtypeIdNodeId of logtypeIdNodeIds) {
            const node = nodeMap.get(logtypeIdNodeId);
            if (node) {
                logtypeIdNodeSet.add(node);
            }
            nodeMap.delete(logtypeIdNodeId);
        }

        for (const [parentId, children] of childrenMap) {
            const parentNode = nodeMap.get(parentId);
            if (parentNode) {
                parentNode.children = children.filter(
                    (child) => !logtypeIdNodeSet.has(child),
                );
            }
        }

        // Step 6: Propagate counts downward. After bottom-up propagation,
        // only ancestors of LogTypeID nodes have non-zero counts. Sibling
        // fields (e.g., logLevel, timestamp) remain at 0 because they
        // have no LogTypeID descendants. Top-down pass: any node whose
        // parent has a non-zero count but whose own count is still 0
        // inherits the parent's count — it appears in the same events.
        if (hasLogtypeStats) {
            const propagateCountsDown = (node: SchemaTreeNode) => {
                for (const child of node.children) {
                    if (0 === child.count && 0 < node.count) {
                        child.count = node.count;
                    }
                    propagateCountsDown(child);
                }
            };

            for (const rootId of rootIds) {
                const rootNode = nodeMap.get(rootId);
                if (rootNode) {
                    propagateCountsDown(rootNode);
                }
            }
        }

        // Prune empty object nodes whose only children were LogTypeID nodes
        const pruneEmptyObjects = (node: SchemaTreeNode): boolean => {
            node.children = node.children.filter((child) => pruneEmptyObjects(child));

            return !("object" === node.type && 0 === node.children.length);
        };

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

    // Fallback: infer token fields from log-shape strings produced by
    // `clp-s --experimental s ... stats.log_shapes`.
    const tokenCounts = new Map<string, number>();
    for (const doc of logtypeDocs) {
        const logType = doc["log_type"];
        if ("string" !== typeof logType) {
            continue;
        }

        const count = "number" === typeof doc["count"] ?
            doc["count"] :
            1;
        const tokens = new Set<string>();
        for (const match of logType.matchAll(/%([^%]+)%/g)) {
            const token = match[1];
            if ("string" !== typeof token || 0 === token.length) {
                continue;
            }

            const parts = token.split(".");
            tokens.add(parts[parts.length - 1] ?? token);
        }

        for (const token of tokens) {
            tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + count);
        }
    }

    if (0 < tokenCounts.size) {
        return {
            children: [...tokenCounts.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, count]) => ({
                    children: [],
                    count,
                    id: `shape-token-${key}`,
                    key,
                    type: "string",
                })),
            count: logtypeDocs.reduce<number>(
                (sum, doc) => sum + ("number" === typeof doc["count"] ? doc["count"] : 0),
                0
            ),
            id: "root",
            key: "root",
            type: "object",
        };
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
