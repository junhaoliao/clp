import {
    describe,
    expect,
    test,
} from "vitest";

import {
    prestoQueryJobCreationSchema,
    prestoQueryJobSchema,
} from "./presto-search.js";


describe("prestoQueryJobCreationSchema", () => {
    test("accepts valid query string", () => {
        const result = prestoQueryJobCreationSchema.parse({
            queryString: "SELECT * FROM table",
        });

        expect(result).toEqual({queryString: "SELECT * FROM table"});
    });

    test("rejects empty queryString", () => {
        expect(() => prestoQueryJobCreationSchema.parse({
            queryString: "",
        })).toThrow();
    });

    test("rejects missing queryString", () => {
        expect(() => prestoQueryJobCreationSchema.parse({})).toThrow();
    });
});

describe("prestoQueryJobSchema", () => {
    test("accepts valid search job ID", () => {
        const result = prestoQueryJobSchema.parse({
            searchJobId: "abc123",
        });

        expect(result).toEqual({searchJobId: "abc123"});
    });

    test("rejects empty searchJobId", () => {
        expect(() => prestoQueryJobSchema.parse({
            searchJobId: "",
        })).toThrow();
    });

    test("rejects numeric searchJobId", () => {
        expect(() => prestoQueryJobSchema.parse({
            searchJobId: 123,
        })).toThrow();
    });
});
