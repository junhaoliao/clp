import {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {JobsResponseSchema} from "@webui/common/schemas/compress-metadata";
import {constants} from "http2";

import settings from "../../../../settings.json" with {type: "json"};
import {
    CompressionMetadataQueryRow,
    CompressionMetadataSimpleQueryRow,
    getCompressionMetadataQuery,
    getCompressionMetadataSimpleQuery,
    getIngestionJobsQuery,
    IngestionJobQueryRow,
} from "./sql.js";
import {
    mapCompressionMetadataRows,
    mapIngestionJobRows,
} from "./utils.js";


/**
 * Compression metadata route.
 *
 * @param fastify
 */
const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
    fastify.get(
        "/",
        {
            schema: {
                response: {
                    [constants.HTTP_STATUS_OK]: JobsResponseSchema,
                },
                tags: ["Compression Metadata"],
            },
        },
        async () => {
            const hasLogIngestor = null !== (settings.LogIngestorHost as string | null);

            let compressionJobs;
            try {
                if (hasLogIngestor) {
                    const [compressionRows] =
                        await fastify.mysql.query<CompressionMetadataQueryRow[]>(
                            getCompressionMetadataQuery()
                        );
                    compressionJobs = mapCompressionMetadataRows(compressionRows);
                } else {
                    const [compressionRows] =
                        await fastify.mysql.query<CompressionMetadataSimpleQueryRow[]>(
                            getCompressionMetadataSimpleQuery()
                        );
                    compressionJobs = mapCompressionMetadataRows(compressionRows);
                }
            } catch {
                const [compressionRows] =
                    await fastify.mysql.query<CompressionMetadataSimpleQueryRow[]>(
                        getCompressionMetadataSimpleQuery()
                    );
                compressionJobs = mapCompressionMetadataRows(compressionRows);
            }

            if (false === hasLogIngestor) {
                return {compressionJobs: compressionJobs, ingestionJobs: []};
            }

            let ingestionRows: IngestionJobQueryRow[] = [];
            try {
                [ingestionRows] = await fastify.mysql.query<IngestionJobQueryRow[]>(
                    getIngestionJobsQuery()
                );
            } catch {
                // ingestion_job table may not exist if log-ingestor hasn't run
            }

            return {
                compressionJobs: compressionJobs,
                ingestionJobs: mapIngestionJobRows(ingestionRows),
            };
        }
    );
};

export default plugin;
