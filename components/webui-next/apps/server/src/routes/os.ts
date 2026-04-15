import fs from "node:fs/promises";

import {fileListSchema} from "@clp/webui-shared";
import {
    createRoute,
    OpenAPIHono,
    z,
} from "@hono/zod-openapi";

import type {Env} from "../env.js";


const HTTP_STATUS_OK = 200;
const HTTP_STATUS_NOT_FOUND = 404;


const osRoutes = new OpenAPIHono<Env>()
    .openapi(
        createRoute({
            method: "get",
            path: "/ls",
            request: {
                query: z.object({path: z.string().default("/")}),
            },
            responses: {
                200: {
                    content: {
                        "application/json": {schema: fileListSchema},
                    },
                    description: "Directory listing",
                },
                404: {
                    content: {
                        "application/json": {schema: z.object({error: z.string()})},
                    },
                    description: "Path not found",
                },
            },
        }),
        async (c) => {
            const {path: dirPath} = c.req.valid("query");

            try {
                await fs.access(dirPath);
            } catch {
                return c.json({error: "Path not found"}, HTTP_STATUS_NOT_FOUND);
            }

            const entries = await fs.readdir(dirPath, {withFileTypes: true});
            const fileEntries = entries.map((entry) => ({
                isExpandable: entry.isDirectory(),
                name: entry.name,
                parentPath: dirPath,
            }));

            return c.json(fileEntries, HTTP_STATUS_OK);
        },
    );

export {osRoutes};
