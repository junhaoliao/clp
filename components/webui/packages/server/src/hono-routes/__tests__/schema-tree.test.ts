import {
    describe,
    expect,
    it,
} from "vitest";

import {buildSchemaTree} from "../schema-tree.js";


interface SchemaChild {
    children: unknown[];
    count: number;
    id: string;
    key: string;
    type: string;
}

/**
 * Asserts that a child with the given ID exists and matches the expected shape.
 *
 * @param children
 * @param childId
 * @param expected
 * @param expected.count
 * @param expected.key
 * @param expected.type
 */
const expectChild = (
    children: SchemaChild[],
    childId: string,
    expected: {count: number; key: string; type: string},
) => {
    const child = children.find((c) => childId === c.id);
    expect(child).toEqual({
        children: [],
        id: childId,
        ...expected,
    });
};

describe("buildSchemaTree — basic behavior", () => {
    it("should return a root node for empty input", () => {
        const result = buildSchemaTree([]);
        expect(result).toEqual({
            children: [],
            count: 0,
            id: "root",
            key: "root",
            type: "object",
        });
    });

    it("should group variables by position and type", () => {
        const docs = [
            {
                logtype: "lt1",
                variables: [
                    {index: 0, type: "string"},
                    {index: 1, type: "int"},
                ],
            },
            {
                logtype: "lt2",
                variables: [
                    {index: 0, type: "string"},
                    {index: 1, type: "float"},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        expect(result.count).toBe(2);
        expect(result.children).toHaveLength(3);
        expectChild(result.children, "var-0-string", {count: 2, key: "0", type: "string"});
        expectChild(result.children, "var-1-int", {count: 1, key: "1", type: "int"});
        expectChild(result.children, "var-1-float", {count: 1, key: "1", type: "float"});
    });

    it("should skip docs without variables", () => {
        const docs = [
            {logtype: "lt-no-vars"},
            {
                logtype: "lt-with-vars",
                variables: [{index: 0, type: "string"}],
            },
        ];

        const result = buildSchemaTree(docs);
        expect(result.count).toBe(2);
        expect(result.children).toHaveLength(1);
        expect(result.children[0]?.id).toBe("var-0-string");
    });
});

describe("buildSchemaTree — edge cases", () => {
    it("should handle docs with empty variables array", () => {
        const docs = [
            {logtype: "lt-empty", variables: []},
        ];

        const result = buildSchemaTree(docs);
        expect(result.count).toBe(1);
        expect(result.children).toHaveLength(0);
    });

    it("should count each type occurrence independently", () => {
        const docs = [
            {
                logtype: "lt1",
                variables: [{index: 0, type: "int"}],
            },
            {
                logtype: "lt2",
                variables: [{index: 0, type: "int"}],
            },
            {
                logtype: "lt3",
                variables: [{index: 0, type: "int"}],
            },
        ];

        const result = buildSchemaTree(docs);
        expect(result.children).toHaveLength(1);
        expect(result.children[0]?.count).toBe(3);
    });

    it("should handle variable indices that are not contiguous", () => {
        const docs = [
            {
                logtype: "lt1",
                variables: [
                    {index: 0, type: "string"},
                    {index: 5, type: "float"},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        expect(result.children).toHaveLength(2);
        expect(result.children.find((c) => "0" === c.key)).toBeDefined();
        expect(result.children.find((c) => "5" === c.key)).toBeDefined();
    });
});

describe("buildSchemaTree — LogTypeID filtering", () => {
    it("should exclude LogTypeID nodes (NodeType 102) from the tree", () => {
        const docs = [
            {
                _schema_tree: true,
                nodes: [
                    {id: 0, parentId: -1, key: "root", type: 5, count: 10, children: [1, 2]},
                    {id: 1, parentId: 0, key: "message", type: 100, count: 10, children: []},
                    {id: 2, parentId: 0, key: "log_type", type: 102, count: 10, children: []},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        expect(result.key).toBe("root");
        expect(result.children).toHaveLength(1);
        expect(result.children[0]?.key).toBe("message");
    });

    it("should prune object nodes that become empty after LogTypeID exclusion", () => {
        const docs = [
            {
                _schema_tree: true,
                nodes: [
                    {id: 0, parentId: -1, key: "root", type: 5, count: 10, children: [1, 2]},
                    {id: 1, parentId: 0, key: "metadata", type: 5, count: 0, children: [3]},
                    {id: 2, parentId: 0, key: "message", type: 100, count: 10, children: []},
                    {id: 3, parentId: 1, key: "log_type", type: 102, count: 10, children: []},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        expect(result.key).toBe("root");
        // "metadata" object node had only a LogTypeID child, so it gets pruned
        expect(result.children).toHaveLength(1);
        expect(result.children[0]?.key).toBe("message");
    });

    it("should keep non-LogTypeID int nodes alongside LogTypeID nodes", () => {
        const docs = [
            {
                _schema_tree: true,
                nodes: [
                    {id: 0, parentId: -1, key: "root", type: 5, count: 10, children: [1, 2, 3]},
                    {id: 1, parentId: 0, key: "count", type: 0, count: 5, children: []},
                    {id: 2, parentId: 0, key: "log_type", type: 102, count: 10, children: []},
                    {id: 3, parentId: 0, key: "message", type: 100, count: 10, children: []},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        expect(result.children).toHaveLength(2);
        const keys = result.children.map((c) => c.key);
        expect(keys).toContain("count");
        expect(keys).toContain("message");
        expect(keys).not.toContain("log_type");
    });
});

describe("buildSchemaTree — event count propagation from logtype stats", () => {
    it("should propagate logtype stat event counts through the tree", () => {
        const docs = [
            // Logtype stat documents (without _schema_tree marker)
            {id: 10, count: 5000, log_type: "INFO *"},
            {id: 20, count: 3000, log_type: "ERROR *"},
            // Schema tree document
            {
                _schema_tree: true,
                nodes: [
                    {id: 0, parentId: -1, key: "root", type: 5, count: 1, children: [1, 2]},
                    {id: 1, parentId: 0, key: "message", type: 100, count: 1, children: [3, 4]},
                    {id: 2, parentId: 0, key: "level", type: 2, count: 1, children: []},
                    {id: 3, parentId: 1, key: "10", type: 102, count: 1, children: []},
                    {id: 4, parentId: 1, key: "20", type: 102, count: 1, children: []},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        // Root count = sum of all LogTypeID descendant counts
        expect(result.count).toBe(8000);
        // "message" node: parent of both LogTypeID nodes → 5000 + 3000
        const messageNode = result.children.find((c) => "message" === c.key);
        expect(messageNode?.count).toBe(8000);
        // "level" node: sibling with no LogTypeID descendants, inherits
        // parent's count via top-down propagation
        const levelNode = result.children.find((c) => "level" === c.key);
        expect(levelNode?.count).toBe(8000);
        // LogTypeID nodes should be excluded from children
        const keys = result.children.flatMap((c) => c.children?.map((cc) => cc.key) ?? []);
        expect(keys).not.toContain("10");
        expect(keys).not.toContain("20");
    });

    it("should fall back to raw.count when no logtype stats are available", () => {
        const docs = [
            // No logtype stat documents — only schema tree
            {
                _schema_tree: true,
                nodes: [
                    {id: 0, parentId: -1, key: "root", type: 5, count: 42, children: [1]},
                    {id: 1, parentId: 0, key: "message", type: 100, count: 7, children: [2]},
                    {id: 2, parentId: 1, key: "5", type: 102, count: 3, children: []},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        // Without logtype stats, raw.count values are used as-is
        expect(result.count).toBe(42);
        const messageNode = result.children.find((c) => "message" === c.key);
        expect(messageNode?.count).toBe(7);
    });

    it("should handle logtype stats with IDs not present in the tree", () => {
        const docs = [
            // Logtype stat with ID 99 — no matching LogTypeID node in tree
            {id: 99, count: 9999, log_type: "ORPHAN *"},
            // Logtype stat with ID 10 — matches tree
            {id: 10, count: 100, log_type: "MATCHED *"},
            {
                _schema_tree: true,
                nodes: [
                    {id: 0, parentId: -1, key: "root", type: 5, count: 1, children: [1]},
                    {id: 1, parentId: 0, key: "msg", type: 100, count: 1, children: [2]},
                    {id: 2, parentId: 1, key: "10", type: 102, count: 1, children: []},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        // Only logtype ID 10 matches → count = 100
        expect(result.count).toBe(100);
        const msgNode = result.children.find((c) => "msg" === c.key);
        expect(msgNode?.count).toBe(100);
    });

    it("should sum counts when multiple logtype stats share the same ID", () => {
        const docs = [
            // Two archives reporting counts for the same logtype dictionary ID
            {id: 5, count: 200, log_type: "INFO *", archive_id: "a1"},
            {id: 5, count: 300, log_type: "INFO *", archive_id: "a2"},
            {
                _schema_tree: true,
                nodes: [
                    {id: 0, parentId: -1, key: "root", type: 5, count: 1, children: [1]},
                    {id: 1, parentId: 0, key: "body", type: 100, count: 1, children: [2]},
                    {id: 2, parentId: 1, key: "5", type: 102, count: 1, children: []},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        expect(result.count).toBe(500);
    });

    it("should propagate counts top-down to siblings without LogTypeID descendants", () => {
        const docs = [
            {id: 10, count: 5000, log_type: "INFO *"},
            {
                _schema_tree: true,
                nodes: [
                    {id: 0, parentId: -1, key: "root", type: 5, count: 1, children: [1, 2, 3]},
                    {id: 1, parentId: 0, key: "message", type: 100, count: 1, children: [4]},
                    {id: 2, parentId: 0, key: "timestamp", type: 2, count: 1, children: []},
                    {id: 3, parentId: 0, key: "service", type: 2, count: 1, children: []},
                    {id: 4, parentId: 1, key: "10", type: 102, count: 1, children: []},
                ],
            },
        ];

        const result = buildSchemaTree(docs);
        // Bottom-up: root=5000, message=5000
        // Top-down: timestamp and service (count=0, parent=5000) → 5000
        expect(result.count).toBe(5000);
        const tsNode = result.children.find((c) => "timestamp" === c.key);
        expect(tsNode?.count).toBe(5000);
        const svcNode = result.children.find((c) => "service" === c.key);
        expect(svcNode?.count).toBe(5000);
    });
});
