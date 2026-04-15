import {z} from "zod";

import {
    CLP_DEFAULT_TABLE_PREFIX,
    SqlTableSuffix,
} from "../config.js";


const MYSQL_TABLE_NAME_MAX_LEN = 64;

const TABLE_SUFFIX_MAX_LEN = Math.max(
    ...Object.values(SqlTableSuffix).map((suffix) => suffix.length),
);

const DATASET_NAME_PATTERN = "^\\w+$";
const DATASET_NAME_SEPARATOR_LEN = 1;
const DATASET_NAME_MAX_LEN =
    MYSQL_TABLE_NAME_MAX_LEN -
    CLP_DEFAULT_TABLE_PREFIX.length -
    DATASET_NAME_SEPARATOR_LEN -
    TABLE_SUFFIX_MAX_LEN;

const datasetNameSchema = z.string().regex(
    new RegExp(DATASET_NAME_PATTERN),
    `Must match pattern: ${DATASET_NAME_PATTERN}`,
)
    .max(DATASET_NAME_MAX_LEN);

const absolutePathSchema = z.string().min(1)
    .regex(
        /^\//,
        "Must be an absolute path starting with /",
    );

const compressionJobCreationSchema = z.object({
    paths: z.array(absolutePathSchema).min(1),
    dataset: datasetNameSchema.optional(),
    timestampKey: z.string().optional(),
    unstructured: z.boolean().optional(),
});

type CompressionJobCreation = z.infer<typeof compressionJobCreationSchema>;

const compressionJobSchema = z.object({
    jobId: z.number(),
});

type CompressionJob = z.infer<typeof compressionJobSchema>;

enum CompressionJobInputType {
    FS = "fs",
    S3 = "s3",
    S3_OBJECT_METADATA = "s3_object_metadata",
}

const clpIoFsInputConfigSchema = z.object({
    dataset: z.string().nullable(),
    path_prefix_to_remove: z.string().nullable(),
    paths_to_compress: z.array(z.string()),
    timestamp_key: z.string().nullable(),
    type: z.literal(CompressionJobInputType.FS),
    unstructured: z.boolean(),
});

const clpIoS3InputConfigSchema = z.object({
    dataset: z.string().nullable(),
    keys: z.array(z.string()).nullable(),
    timestamp_key: z.string().nullable(),
    type: z.literal(CompressionJobInputType.S3),
    unstructured: z.boolean(),
});

const clpIoS3ObjectMetadataInputConfigSchema = z.object({
    dataset: z.string().nullable(),
    timestamp_key: z.string().nullable(),
    type: z.literal(CompressionJobInputType.S3_OBJECT_METADATA),
    unstructured: z.boolean(),
});

const clpIoOutputConfigSchema = z.object({
    compression_level: z.number(),
    target_archive_size: z.number(),
    target_dictionaries_size: z.number(),
    target_encoded_file_size: z.number(),
    target_segment_size: z.number(),
});

const clpIoConfigSchema = z.object({
    input: z.union([
        clpIoFsInputConfigSchema,
        clpIoS3InputConfigSchema,
        clpIoS3ObjectMetadataInputConfigSchema,
    ]),
    output: clpIoOutputConfigSchema,
});

const clpIoPartialConfigSchema = z.object({
    input: z.union([
        clpIoFsInputConfigSchema.partial(),
        clpIoS3InputConfigSchema.partial(),
        clpIoS3ObjectMetadataInputConfigSchema.partial(),
    ]),
    output: clpIoOutputConfigSchema.partial(),
});

type ClpIoConfig = z.infer<typeof clpIoConfigSchema>;

type ClpIoS3InputConfig = z.infer<typeof clpIoS3InputConfigSchema>;

type ClpIoFsInputConfig = z.infer<typeof clpIoFsInputConfigSchema>;

export {
    clpIoConfigSchema,
    clpIoPartialConfigSchema,
    compressionJobCreationSchema,
    CompressionJobInputType,
    compressionJobSchema,
    DATASET_NAME_MAX_LEN,
    DATASET_NAME_PATTERN,
    datasetNameSchema,
};
export type {
    ClpIoConfig,
    ClpIoFsInputConfig,
    ClpIoS3InputConfig,
    CompressionJob,
    CompressionJobCreation,
};
