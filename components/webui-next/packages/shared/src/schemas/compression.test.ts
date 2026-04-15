import {
    describe,
    expect,
    test,
} from "vitest";

import {
    clpIoConfigSchema,
    clpIoPartialConfigSchema,
    compressionJobCreationSchema,
    CompressionJobInputType,
    compressionJobSchema,
} from "./compression.js";


describe("compressionJobCreationSchema", () => {
    const validPayload = {
        paths: ["/var/log/test.log"],
        dataset: "default",
        timestampKey: "timestamp",
        unstructured: false,
    };

    test("accepts valid payload with all fields", () => {
        expect(compressionJobCreationSchema.parse(validPayload)).toEqual(validPayload);
    });

    test("accepts payload with only required fields", () => {
        const result = compressionJobCreationSchema.parse({
            paths: ["/var/log"],
        });

        expect(result.paths).toEqual(["/var/log"]);
        expect(result.dataset).toBeUndefined();
        expect(result.timestampKey).toBeUndefined();
        expect(result.unstructured).toBeUndefined();
    });

    test("accepts multiple paths", () => {
        const payload = {
            ...validPayload,
            paths: ["/var/log/a",
                "/var/log/b",
                "/var/log/c"],
        };

        expect(compressionJobCreationSchema.parse(payload).paths).toHaveLength(3);
    });

    test("rejects empty paths array", () => {
        const payload = {
            ...validPayload,
            paths: [],
        };

        expect(() => compressionJobCreationSchema.parse(payload)).toThrow();
    });

    test("rejects relative paths", () => {
        const payload = {
            ...validPayload,
            paths: ["relative/path"],
        };

        expect(() => compressionJobCreationSchema.parse(payload)).toThrow();
    });

    test("rejects missing paths", () => {
        expect(() => compressionJobCreationSchema.parse({})).toThrow();
    });

    test("rejects invalid dataset name with special chars", () => {
        const payload = {
            ...validPayload,
            dataset: "invalid-name!",
        };

        expect(() => compressionJobCreationSchema.parse(payload)).toThrow();
    });

    test("accepts valid dataset name with underscores", () => {
        const payload = {
            ...validPayload,
            dataset: "my_dataset_123",
        };

        expect(compressionJobCreationSchema.parse(payload).dataset).toBe("my_dataset_123");
    });
});

describe("compressionJobSchema", () => {
    test("accepts valid job ID", () => {
        expect(compressionJobSchema.parse({jobId: 42})).toEqual({jobId: 42});
    });

    test("rejects missing jobId", () => {
        expect(() => compressionJobSchema.parse({})).toThrow();
    });
});

describe("clpIoConfigSchema", () => {
    const fsConfig = {
        input: {
            dataset: "default",
            path_prefix_to_remove: null,
            paths_to_compress: ["/var/log/test.log"],
            timestamp_key: "timestamp",
            type: CompressionJobInputType.FS as const,
            unstructured: false,
        },
        output: {
            compression_level: 3,
            target_archive_size: 268435456,
            target_dictionaries_size: 33554432,
            target_encoded_file_size: 268435456,
            target_segment_size: 268435456,
        },
    };

    test("accepts valid FS config", () => {
        expect(clpIoConfigSchema.parse(fsConfig)).toEqual(fsConfig);
    });

    test("accepts valid S3 config", () => {
        const s3Config = {
            input: {
                dataset: "default",
                keys: ["bucket/key1"],
                timestamp_key: null,
                type: CompressionJobInputType.S3 as const,
                unstructured: false,
            },
            output: fsConfig.output,
        };

        expect(clpIoConfigSchema.parse(s3Config)).toEqual(s3Config);
    });

    test("accepts valid S3_OBJECT_METADATA config", () => {
        const s3ObjConfig = {
            input: {
                dataset: "default",
                timestamp_key: null,
                type: CompressionJobInputType.S3_OBJECT_METADATA as const,
                unstructured: false,
            },
            output: fsConfig.output,
        };

        expect(clpIoConfigSchema.parse(s3ObjConfig)).toEqual(s3ObjConfig);
    });

    test("rejects invalid input type", () => {
        const badConfig = {
            input: {
                ...fsConfig.input,
                type: "invalid",
            },
            output: fsConfig.output,
        };

        expect(() => clpIoConfigSchema.parse(badConfig)).toThrow();
    });
});

describe("clpIoPartialConfigSchema", () => {
    test("accepts partial FS config", () => {
        const partialConfig = {
            input: {
                paths_to_compress: ["/var/log"],
                type: CompressionJobInputType.FS as const,
            },
            output: {
                compression_level: 3,
            },
        };
        const result = clpIoPartialConfigSchema.parse(partialConfig);
        expect(result.input).toHaveProperty("paths_to_compress");
    });
});
