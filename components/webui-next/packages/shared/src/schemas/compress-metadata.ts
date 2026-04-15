import {z} from "zod";

import {clpIoPartialConfigSchema} from "./compression.js";


const compressionMetadataBaseSchema = z.object({
    _id: z.number(),
    compressed_size: z.number(),
    duration: z.number().nullable(),
    start_time: z.string().nullable(),
    status: z.number(),
    status_msg: z.string(),
    uncompressed_size: z.number(),
    update_time: z.string(),
});

const compressionMetadataSchema = compressionMetadataBaseSchema.extend({
    clp_config: z.unknown(),
});

type CompressionMetadata = z.infer<typeof compressionMetadataSchema>;

const compressionMetadataDecodedSchema = compressionMetadataBaseSchema.extend({
    clp_config: clpIoPartialConfigSchema,
});

type CompressionMetadataDecoded = z.infer<typeof compressionMetadataDecodedSchema>;

export {
    compressionMetadataDecodedSchema,
    compressionMetadataSchema,
};
export type {
    CompressionMetadata,
    CompressionMetadataDecoded,
};
