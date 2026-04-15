import {
    compressionJobCreationSchema,
    CompressionJobInputType,
} from "@clp/webui-shared";
import {
    createRoute,
    OpenAPIHono,
    z,
} from "@hono/zod-openapi";

import type {Env} from "../env.js";
import {CONTAINER_INPUT_LOGS_ROOT_DIR} from "./compress/constants.js";


const HTTP_STATUS_OK = 200;


const compressRoutes = new OpenAPIHono<Env>()
    .openapi(
        createRoute({
            method: "post",
            path: "/",
            request: {
                body: {
                    content: {
                        "application/json": {schema: compressionJobCreationSchema},
                    },
                },
            },
            responses: {
                200: {
                    content: {
                        "application/json": {
                            schema: z.object({jobId: z.number()}),
                        },
                    },
                    description: "Compression job submitted",
                },
            },
        }),
        async (c) => {
            const {compressionJobDbManager} = c.var;
            const {paths, dataset, timestampKey, unstructured} = c.req.valid("json");
            const settings = (await import("../lib/config.js")).default;

            // Transform host paths to container paths.
            // In dev mode, the client browses the host filesystem and sends host paths
            // (e.g., "/home/junhao/samples/file.log"). We prepend CONTAINER_INPUT_LOGS_ROOT_DIR
            // to create container paths (e.g., "/mnt/logs/home/junhao/samples/file.log").
            // In prod mode, the client browses the container filesystem and paths already
            // start with CONTAINER_INPUT_LOGS_ROOT_DIR, so we use them as-is.
            const containerPaths = paths.map((p: string) => {
                if (p.startsWith(CONTAINER_INPUT_LOGS_ROOT_DIR)) {
                    return p;
                }

                return CONTAINER_INPUT_LOGS_ROOT_DIR + p;
            });

            const clpConfig = {
                input: {
                    type: CompressionJobInputType.FS,
                    dataset: dataset ?? "default",
                    path_prefix_to_remove: CONTAINER_INPUT_LOGS_ROOT_DIR,
                    paths_to_compress: containerPaths,
                    timestamp_key: timestampKey ?? null,
                    unstructured: unstructured ?? false,
                },
                output: {
                    compression_level: settings.ArchiveOutputCompressionLevel,
                    target_archive_size: settings.ArchiveOutputTargetArchiveSize,
                    target_dictionaries_size: settings.ArchiveOutputTargetDictionariesSize,
                    target_encoded_file_size: settings.ArchiveOutputTargetEncodedFileSize,
                    target_segment_size: settings.ArchiveOutputTargetSegmentSize,
                },
            };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const jobId = await compressionJobDbManager.submitJob(clpConfig as any);

            return c.json({jobId} as const, HTTP_STATUS_OK);
        },
    );

export {compressRoutes};
