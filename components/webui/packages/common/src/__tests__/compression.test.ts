import {
    describe,
    expect,
    it,
} from "vitest";

import {Value} from "@sinclair/typebox/value";

import {
    ClpIoConfigSchema,
    CompressionJobCreationSchema,
} from "../schemas/compression.js";


describe("CompressionJobCreationSchema", () => {
    it("should accept FS job with schemaContent", () => {
        const body = {
            inputType: "fs",
            paths: ["/var/log/test.log"],
            schemaContent: ":timestamp:string\n:level:string",
        };
        expect(Value.Check(CompressionJobCreationSchema, body)).toBe(true);
    });

    it("should accept FS job without schemaContent", () => {
        const body = {
            inputType: "fs",
            paths: ["/var/log/test.log"],
        };
        expect(Value.Check(CompressionJobCreationSchema, body)).toBe(true);
    });

    it("should accept S3 job with schemaContent", () => {
        const body = {
            bucket: "my-bucket",
            inputType: "s3",
            regionCode: "us-east-1",
            scanner: false,
            schemaContent: ":timestamp:string",
        };
        expect(Value.Check(CompressionJobCreationSchema, body)).toBe(true);
    });

    it("should reject invalid schemaContent type", () => {
        const body = {
            inputType: "fs",
            paths: ["/var/log/test.log"],
            schemaContent: 123,
        };
        expect(Value.Check(CompressionJobCreationSchema, body)).toBe(false);
    });
});

describe("ClpIoConfigSchema", () => {
    it("should accept config with null schema_content", () => {
        const config = {
            input: {
                type: "fs",
                path_prefix_to_remove: "/logs",
                paths_to_compress: ["/logs/test.log"],
                dataset: null,
                timestamp_key: null,
                unstructured: true,
            },
            output: {
                compression_level: 3,
                target_archive_size: 268435456,
                target_dictionaries_size: 536870912,
                target_encoded_file_size: 268435456,
                target_segment_size: 268435456,
            },
            schema_content: null,
        };
        expect(Value.Check(ClpIoConfigSchema, config)).toBe(true);
    });

    it("should accept config with schema_content string", () => {
        const config = {
            input: {
                type: "fs",
                path_prefix_to_remove: "/logs",
                paths_to_compress: ["/logs/test.log"],
                dataset: "test",
                timestamp_key: null,
                unstructured: false,
            },
            output: {
                compression_level: 3,
                target_archive_size: 268435456,
                target_dictionaries_size: 536870912,
                target_encoded_file_size: 268435456,
                target_segment_size: 268435456,
            },
            schema_content: ":timestamp:string",
        };
        expect(Value.Check(ClpIoConfigSchema, config)).toBe(true);
    });

    it("should reject config missing schema_content field", () => {
        const config = {
            input: {
                type: "fs",
                path_prefix_to_remove: "/logs",
                paths_to_compress: ["/logs/test.log"],
                dataset: null,
                timestamp_key: null,
                unstructured: true,
            },
            output: {
                compression_level: 3,
                target_archive_size: 268435456,
                target_dictionaries_size: 536870912,
                target_encoded_file_size: 268435456,
                target_segment_size: 268435456,
            },
        };
        expect(Value.Check(ClpIoConfigSchema, config)).toBe(false);
    });
});
