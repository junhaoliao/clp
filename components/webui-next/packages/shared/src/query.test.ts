import {
    describe,
    expect,
    test,
} from "vitest";

import {
    EXTRACT_JOB_TYPES,
    QUERY_JOB_TYPE,
} from "./query.js";


describe("QUERY_JOB_TYPE", () => {
    test("has expected type values", () => {
        expect(QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION).toBe(0);
        expect(QUERY_JOB_TYPE.EXTRACT_IR).toBe(1);
        expect(QUERY_JOB_TYPE.EXTRACT_JSON).toBe(2);
    });
});

describe("EXTRACT_JOB_TYPES", () => {
    test("contains EXTRACT_IR and EXTRACT_JSON", () => {
        expect(EXTRACT_JOB_TYPES.has(QUERY_JOB_TYPE.EXTRACT_IR)).toBe(true);
        expect(EXTRACT_JOB_TYPES.has(QUERY_JOB_TYPE.EXTRACT_JSON)).toBe(true);
    });

    test("does not contain SEARCH_OR_AGGREGATION", () => {
        expect(EXTRACT_JOB_TYPES.has(QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION)).toBe(false);
    });
});
