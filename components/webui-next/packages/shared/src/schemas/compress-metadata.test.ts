import {
    describe,
    expect,
    test,
} from "vitest";

import {
    compressionMetadataDecodedSchema,
    compressionMetadataSchema,
} from "./compress-metadata.js";


describe("compressionMetadataSchema", () => {
    const validMetadata = {
        _id: 1,
        compressed_size: 1024,
        duration: 5.5,
        start_time: "2024-01-01T00:00:00Z",
        status: 2,
        status_msg: "",
        uncompressed_size: 4096,
        update_time: "2024-01-01T00:00:05Z",
        clp_config: Buffer.from("raw"),
    };

    test("accepts valid metadata with Buffer clp_config", () => {
        const result = compressionMetadataSchema.parse(validMetadata);
        expect(result._id).toBe(1);
        expect(result.status).toBe(2);
    });

    test("accepts null duration and start_time", () => {
        const metadata = {
            ...validMetadata,
            duration: null,
            start_time: null,
        };

        expect(compressionMetadataSchema.parse(metadata).duration).toBeNull();
    });
});

describe("compressionMetadataDecodedSchema", () => {
    const validDecoded = {
        _id: 1,
        compressed_size: 1024,
        duration: 5.5,
        start_time: "2024-01-01T00:00:00Z",
        status: 2,
        status_msg: "",
        uncompressed_size: 4096,
        update_time: "2024-01-01T00:00:05Z",
        clp_config: {
            input: {
                paths_to_compress: ["/var/log"],
                type: "fs",
            },
            output: {
                compression_level: 3,
            },
        },
    };

    test("accepts valid decoded metadata", () => {
        const result = compressionMetadataDecodedSchema.parse(validDecoded);
        expect(result._id).toBe(1);
    });

    test("accepts null duration", () => {
        const metadata = {
            ...validDecoded,
            duration: null,
        };

        expect(compressionMetadataDecodedSchema.parse(metadata).duration).toBeNull();
    });
});
