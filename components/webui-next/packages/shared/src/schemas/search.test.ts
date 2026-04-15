import {
    describe,
    expect,
    test,
} from "vitest";

import {
    queryJobCreationSchema,
    queryJobSchema,
} from "./search.js";


describe("queryJobCreationSchema", () => {
    const validPayload = {
        datasets: ["default"],
        ignoreCase: false,
        queryString: "error",
        timeRangeBucketSizeMillis: 60000,
        timestampBegin: null,
        timestampEnd: null,
    };

    test("accepts valid payload with null timestamps", () => {
        const result = queryJobCreationSchema.parse(validPayload);
        expect(result).toEqual(validPayload);
    });

    test("accepts valid payload with integer timestamps", () => {
        const payload = {
            ...validPayload,
            timestampBegin: 1000000,
            timestampEnd: 2000000,
        };

        expect(queryJobCreationSchema.parse(payload)).toEqual(payload);
    });

    test("accepts empty datasets array", () => {
        const payload = {
            ...validPayload,
            datasets: [],
        };

        expect(queryJobCreationSchema.parse(payload)).toEqual(payload);
    });

    test("rejects missing required fields", () => {
        expect(() => queryJobCreationSchema.parse({})).toThrow();
    });

    test("rejects empty queryString", () => {
        const payload = {
            ...validPayload,
            queryString: "",
        };

        expect(() => queryJobCreationSchema.parse(payload)).toThrow();
    });

    test("rejects non-boolean ignoreCase", () => {
        const payload = {
            ...validPayload,
            ignoreCase: "true",
        };

        expect(() => queryJobCreationSchema.parse(payload)).toThrow();
    });

    test("rejects non-integer timeRangeBucketSizeMillis", () => {
        const payload = {
            ...validPayload,
            timeRangeBucketSizeMillis: 1.5,
        };

        expect(() => queryJobCreationSchema.parse(payload)).toThrow();
    });

    test("rejects string timestamps (not null)", () => {
        const payload = {
            ...validPayload,
            timestampBegin: "2024-01-01",
        };

        expect(() => queryJobCreationSchema.parse(payload)).toThrow();
    });
});

describe("queryJobSchema", () => {
    test("accepts valid job IDs", () => {
        const result = queryJobSchema.parse({
            searchJobId: 1,
            aggregationJobId: 2,
        });

        expect(result).toEqual({searchJobId: 1, aggregationJobId: 2});
    });

    test("rejects zero job IDs", () => {
        expect(() => queryJobSchema.parse({
            searchJobId: 0,
            aggregationJobId: 1,
        })).toThrow();
    });

    test("rejects string job IDs", () => {
        expect(() => queryJobSchema.parse({
            searchJobId: "1",
            aggregationJobId: "2",
        })).toThrow();
    });

    test("rejects missing fields", () => {
        expect(() => queryJobSchema.parse({})).toThrow();
    });
});
