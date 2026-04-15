import {sqlSchema} from "@clp/webui-shared";
import {
    createRoute,
    OpenAPIHono,
    z,
} from "@hono/zod-openapi";

import type {Env} from "../env.js";


const HTTP_STATUS_OK = 200;


const archiveMetadataRoutes = new OpenAPIHono<Env>()
    .openapi(
        createRoute({
            method: "post",
            path: "/sql",
            request: {
                body: {
                    content: {
                        "application/json": {schema: sqlSchema},
                    },
                },
            },
            responses: {
                200: {
                    content: {
                        "application/json": {
                            schema: z.record(z.string(), z.unknown()).or(z.array(z.record(z.string(), z.unknown()))),
                        },
                    },
                    description: "SQL query results",
                },
            },
        }),
        async (c) => {
            const {queryString} = c.req.valid("json");
            const {pool} = await import("../db/index.js");
            const [rows] = await pool.query(queryString);
            return c.json(rows as Record<string, unknown>[], HTTP_STATUS_OK);
        },
    );

export {archiveMetadataRoutes};
