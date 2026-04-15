import {
    describe,
    expect,
    test,
} from "vitest";

import {QUERY_JOB_TYPE} from "../query.js";
import {streamFileExtractionSchema} from "./stream-files.js";


describe("streamFileExtractionSchema", () => {
    const validPayload = {
        dataset: "default",
        extractJobType: QUERY_JOB_TYPE.EXTRACT_IR,
        logEventIdx: 42,
        streamId: "abc123",
    };

    test("accepts valid payload with dataset", () => {
        expect(streamFileExtractionSchema.parse(validPayload)).toEqual(validPayload);
    });

    test("accepts null dataset", () => {
        const payload = {...validPayload, dataset: null};
        expect(streamFileExtractionSchema.parse(payload).dataset).toBeNull();
    });

    test("accepts EXTRACT_JSON job type", () => {
        const payload = {
            ...validPayload,
            extractJobType: QUERY_JOB_TYPE.EXTRACT_JSON,
        };

        expect(streamFileExtractionSchema.parse(payload).extractJobType).toBe(
            QUERY_JOB_TYPE.EXTRACT_JSON,
        );
    });

    test("rejects invalid extractJobType", () => {
        const payload = {
            ...validPayload,
            extractJobType: 99,
        };

        expect(() => streamFileExtractionSchema.parse(payload)).toThrow();
    });

    test("rejects non-integer logEventIdx", () => {
        const payload = {
            ...validPayload,
            logEventIdx: 1.5,
        };

        expect(() => streamFileExtractionSchema.parse(payload)).toThrow();
    });

    test("rejects empty streamId", () => {
        const payload = {
            ...validPayload,
            streamId: "",
        };

        expect(() => streamFileExtractionSchema.parse(payload)).toThrow();
    });

    test("rejects missing fields", () => {
        expect(() => streamFileExtractionSchema.parse({})).toThrow();
    });
});
