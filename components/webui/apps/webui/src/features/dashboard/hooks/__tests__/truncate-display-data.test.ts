import {describe, it, expect} from "vitest";
import {QUERY_LIMITS} from "@webui/datasource/types";
import type {DataFrame} from "@webui/datasource/types";
import {truncateDataForDisplay} from "../truncate-display-data";

const {MAX_DISPLAY_ROWS} = QUERY_LIMITS;

const makeFrame = (length: number): DataFrame => ({
    name: "test",
    fields: [{name: "value", type: "number", values: Array.from({length}, (_, i) => i)}],
    length,
});

describe("truncateDataForDisplay", () => {
    it("should not truncate frames within the display limit", () => {
        const frame = makeFrame(100);
        const result = truncateDataForDisplay([frame]);
        expect(result[0]!.length).toBe(100);
        expect(result[0]!.rowsTruncated).toBeUndefined();
    });

    it("should truncate frames exceeding MAX_DISPLAY_ROWS", () => {
        const frame = makeFrame(MAX_DISPLAY_ROWS + 1000);
        const result = truncateDataForDisplay([frame]);
        expect(result[0]!.length).toBe(MAX_DISPLAY_ROWS);
        expect(result[0]!.fields[0]!.values).toHaveLength(MAX_DISPLAY_ROWS);
        expect(result[0]!.rowsTruncated).toBe(true);
    });

    it("should handle empty frames", () => {
        const result = truncateDataForDisplay([]);
        expect(result).toEqual([]);
    });

    it("should handle frames exactly at the limit", () => {
        const frame = makeFrame(MAX_DISPLAY_ROWS);
        const result = truncateDataForDisplay([frame]);
        expect(result[0]!.length).toBe(MAX_DISPLAY_ROWS);
        expect(result[0]!.rowsTruncated).toBeUndefined();
    });
});
