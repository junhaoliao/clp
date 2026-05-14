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
