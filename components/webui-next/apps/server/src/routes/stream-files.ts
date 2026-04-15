import {
    EXTRACT_JOB_TYPES,
    streamFileExtractionSchema,
} from "@clp/webui-shared";
import {
    createRoute,
    OpenAPIHono,
    z,
} from "@hono/zod-openapi";

import type {Env} from "../env.js";


const HTTP_STATUS_OK = 200;

const EMPTY_STREAM_FILE_RESULT = {
    begin_msg_ix: 0,
    end_msg_ix: 0,
    is_last_chunk: false,
    path: "",
    stream_id: "",
} as const;


const streamFilesRoutes = new OpenAPIHono<Env>()
    .openapi(
        createRoute({
            method: "post",
            path: "/extract",
            request: {
                body: {
                    content: {
                        "application/json": {schema: streamFileExtractionSchema},
                    },
                },
            },
            responses: {
                200: {
                    content: {
                        "application/json": {
                            schema: z.object({
                                begin_msg_ix: z.number(),
                                end_msg_ix: z.number(),
                                is_last_chunk: z.boolean(),
                                path: z.string(),
                                stream_id: z.string(),
                            }),
                        },
                    },
                    description: "Stream file extracted",
                },
            },
        }),
        async (c) => {
            const {streamFileManager, s3Manager} = c.var;
            const {dataset, extractJobType, logEventIdx, streamId} = c.req.valid("json");

            if (!EXTRACT_JOB_TYPES.has(extractJobType)) {
                return c.json(EMPTY_STREAM_FILE_RESULT, HTTP_STATUS_OK);
            }

            // Check if already extracted
            let metadata = await streamFileManager.getExtractedStreamFileMetadata(
                streamId,
                logEventIdx,
            );

            if (!metadata) {
                // Submit extraction job
                const jobId = await streamFileManager.submitAndWaitForExtractStreamJob(
                    streamId,
                    logEventIdx,
                    extractJobType,
                    dataset,
                );

                if (null === jobId) {
                    return c.json(EMPTY_STREAM_FILE_RESULT, HTTP_STATUS_OK);
                }

                // Re-fetch metadata
                metadata = await streamFileManager.getExtractedStreamFileMetadata(
                    streamId,
                    logEventIdx,
                );
                if (!metadata) {
                    return c.json(EMPTY_STREAM_FILE_RESULT, HTTP_STATUS_OK);
                }
            }

            // Resolve path
            let resolvedPath: string;
            if (s3Manager && s3Manager.getS3PathPrefix()) {
                resolvedPath = await s3Manager.getPreSignedUrl(metadata.path);
            } else {
                resolvedPath = `/streams/${metadata.path}`;
            }

            return c.json({
                begin_msg_ix: metadata.begin_msg_ix,
                end_msg_ix: metadata.end_msg_ix,
                is_last_chunk: metadata.is_last_chunk,
                path: resolvedPath,
                stream_id: metadata.stream_id,
            } as const, HTTP_STATUS_OK);
        },
    );

export {streamFilesRoutes};
