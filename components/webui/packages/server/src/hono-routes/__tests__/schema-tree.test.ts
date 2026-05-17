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
