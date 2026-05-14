import type {DataFrame} from "@webui/datasource/types";

import {mergeDataFrame} from "../panel-query-utils";


describe("mergeDataFrame", () => {
    it("adds a new frame to an empty map", () => {
        const accumulated = new Map<string, DataFrame>();
        const partial: DataFrame = {
            name: "A",
            fields: [
                {name: "timestamp",
                    type: "time",
                    values: [1000,
                        2000]},
                {name: "message",
                    type: "string",
                    values: ["hello",
                        "world"]},
            ],
            length: 2,
        };

        mergeDataFrame(accumulated, partial);

        expect(accumulated.size).toBe(1);
        const merged = accumulated.get("A")!;
        expect(merged.length).toBe(2);
        expect(merged.fields[0]!.values).toEqual([1000,
            2000]);
        expect(merged.fields[1]!.values).toEqual(["hello",
            "world"]);
    });

    it("appends values to an existing frame", () => {
        const accumulated = new Map<string, DataFrame>();
        const frame1: DataFrame = {
            name: "A",
            fields: [
                {name: "timestamp", type: "time", values: [1000]},
                {name: "message", type: "string", values: ["first"]},
            ],
            length: 1,
        };
        const frame2: DataFrame = {
            name: "A",
            fields: [
                {name: "timestamp",
                    type: "time",
                    values: [2000,
                        3000]},
                {name: "message",
                    type: "string",
                    values: ["second",
                        "third"]},
            ],
            length: 2,
        };

        mergeDataFrame(accumulated, frame1);
        mergeDataFrame(accumulated, frame2);

        const merged = accumulated.get("A")!;
        expect(merged.length).toBe(3);
        expect(merged.fields[0]!.values).toEqual([1000,
            2000,
            3000]);
        expect(merged.fields[1]!.values).toEqual(["first",
            "second",
            "third"]);
    });

    it("handles new fields appearing in later partials", () => {
        const accumulated = new Map<string, DataFrame>();
        const frame1: DataFrame = {
            name: "A",
            fields: [
                {name: "timestamp", type: "time", values: [1000]},
            ],
            length: 1,
        };
        const frame2: DataFrame = {
            name: "A",
            fields: [
                {name: "timestamp", type: "time", values: [2000]},
                {name: "message", type: "string", values: ["hello"]},
            ],
            length: 1,
        };

        mergeDataFrame(accumulated, frame1);
        mergeDataFrame(accumulated, frame2);

        const merged = accumulated.get("A")!;
        expect(merged.length).toBe(2);
        expect(merged.fields).toHaveLength(2);
        expect(merged.fields[1]!.name).toBe("message");
    });

    it("propagates rowsTruncated from partials", () => {
        const accumulated = new Map<string, DataFrame>();
        const frame1: DataFrame = {
            name: "A",
            fields: [{name: "x", type: "number", values: [1]}],
            length: 1,
        };
        const frame2: DataFrame = {
            name: "A",
            fields: [{name: "x", type: "number", values: [2]}],
            length: 1,
            rowsTruncated: true,
        };

        mergeDataFrame(accumulated, frame1);
        mergeDataFrame(accumulated, frame2);

        expect(accumulated.get("A")!.rowsTruncated).toBe(true);
    });

    it("handles multiple refIds independently", () => {
        const accumulated = new Map<string, DataFrame>();
        const frameA: DataFrame = {
            name: "A",
            fields: [{name: "x", type: "number", values: [1]}],
            length: 1,
        };
        const frameB: DataFrame = {
            name: "B",
            fields: [{name: "y", type: "string", values: ["hello"]}],
            length: 1,
        };

        mergeDataFrame(accumulated, frameA);
        mergeDataFrame(accumulated, frameB);

        expect(accumulated.size).toBe(2);
        expect(accumulated.get("A")!.fields[0]!.name).toBe("x");
        expect(accumulated.get("B")!.fields[0]!.name).toBe("y");
    });

    it("clones field values to avoid mutation of source", () => {
        const accumulated = new Map<string, DataFrame>();
        const originalValues = [1000];
        const partial: DataFrame = {
            name: "A",
            fields: [{name: "ts", type: "time", values: originalValues}],
            length: 1,
        };

        mergeDataFrame(accumulated, partial);

        // Mutating the original should not affect the accumulated frame
        originalValues.push(2000);

        expect(accumulated.get("A")!.fields[0]!.values).toEqual([1000]);
    });
});
