import {
    describe,
    expect,
    it,
} from "vitest";

import {countSharedNodes} from "../shared-node-count";


import type {SchemaTreeNode} from "@/features/clpp/types";


const mkLeaf = (
    key: string,
    type: "string" | "int" | "float" = "string",
    count: number = 1,
): SchemaTreeNode => ({
    children: [],
    count,
    id: key,
    key,
    type,
});

const mkObj = (
    key: string,
    children: SchemaTreeNode[],
    id: string = key,
): SchemaTreeNode => ({
    children,
    count: 0,
    id,
    key,
    type: "object",
});

describe("countSharedNodes", () => {
    it("should return 0 for a tree with no shared nodes", () => {
        const tree = mkObj("root", [
            mkLeaf("message"),
            mkLeaf("timestamp"),
            mkLeaf("level"),
        ]);
        expect(countSharedNodes(tree)).toBe(0);
    });

    it("should return 0 for a single-node tree", () => {
        const tree = mkLeaf("message");
        expect(countSharedNodes(tree)).toBe(0);
    });

    it("should count nodes with same key under different parents", () => {
        // INT appears under two different logtype parents (empty-key containers)
        const tree = mkObj("root", [
            mkObj("", [mkLeaf("logLevel"), mkLeaf("INT", "int")], "var-0-string"),
            mkObj("", [mkLeaf("logLevel"), mkLeaf("INT", "int"), mkLeaf("fetcherID")], "var-1-string"),
        ]);
        // logLevel appears under 2 parents, INT appears under 2 parents
        expect(countSharedNodes(tree)).toBe(2);
    });

    it("should not count same key under same parent as shared", () => {
        // Two different keys, no sharing
        const tree = mkObj("root", [
            mkLeaf("message"),
            mkLeaf("count", "int"),
        ]);
        expect(countSharedNodes(tree)).toBe(0);
    });

    it("should handle deeply nested shared nodes", () => {
        const tree = mkObj("root", [
            mkObj("parent1", [
                mkObj("child1", [
                    mkLeaf("shared_field"),
                ]),
            ]),
            mkObj("parent2", [
                mkObj("child2", [
                    mkLeaf("shared_field"),
                ]),
            ]),
        ]);
        expect(countSharedNodes(tree)).toBe(1);
    });

    it("should skip object-type nodes when counting", () => {
        const tree = mkObj("root", [
            mkObj("container1", [
                mkLeaf("field_a"),
            ]),
            mkObj("container2", [
                mkLeaf("field_a"),
            ]),
        ]);
        // Only "field_a" is shared (object nodes are skipped)
        expect(countSharedNodes(tree)).toBe(1);
    });
});
