import {
    createRoute,
    OpenAPIHono,
    z,
} from "@hono/zod-openapi";

import type {Env} from "../env.js";
import {CompressionJobDbManager} from "../services/compression-job-db-manager.js";


const HTTP_STATUS_OK = 200;


const compressMetadataRoutes = new OpenAPIHono<Env>()
    .openapi(
        createRoute({
            method: "get",
            path: "/",
            responses: {
                200: {
                    content: {
                        "application/json": {
                            schema: z.array(z.record(z.string(), z.unknown())),
                        },
                    },
                    description: "Compression metadata list",
                },
            },
        }),
        async (c) => {
            const {compressionJobDbManager} = c.var;
            const rows = await compressionJobDbManager.getCompressionMetadata();

            const decodedRows = rows.map((row) => {
                const decoded = CompressionJobDbManager.decodeJobConfig(
                    Buffer.from(row.clp_config as Uint8Array),
                );

                return {
                    ...row,
                    clp_config: decoded,
                };
            });

            return c.json(decodedRows, HTTP_STATUS_OK);
        },
    );

export {compressMetadataRoutes};
