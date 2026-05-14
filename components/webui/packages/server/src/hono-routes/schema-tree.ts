import {tbValidator} from "@hono/typebox-validator";
import {
    type TSchema,
    Type,
} from "@sinclair/typebox";
import {Hono} from "hono";


const SchemaTreeQuerySchema = Type.Object({
    archive_id: Type.String({minLength: 1}),
});

const MOCK_SCHEMA_TREE = {
    children: [
        {
            children: [
                {
                    children: [],
                    count: 15420,
                    id: "var-0-app",
                    key: "application_id",
                    type: "string" as const,
                },
                {
                    children: [],
                    count: 873,
                    id: "var-0-container",
                    key: "container_id",
                    type: "string" as const,
                },
                {
                    children: [],
                    count: 342,
                    id: "var-0-job",
                    key: "job_id",
                    type: "string" as const,
                },
            ],
            count: 16635,
            id: "var-0",
            key: "0",
            type: "string" as const,
        },
        {
            children: [
                {
                    children: [],
                    count: 873,
                    id: "var-1-host",
                    key: "host",
                    type: "string" as const,
                },
                {
                    children: [],
                    count: 342,
                    id: "var-1-exit-code",
                    key: "exit_code",
                    type: "int" as const,
                },
            ],
            count: 1215,
            id: "var-1",
            key: "1",
            type: "object" as const,
        },
        {
            children: [],
            count: 342,
            id: "var-2",
            key: "2",
            type: "float" as const,
        },
    ],
    count: 16635,
    id: "root",
    key: "root",
    type: "object" as const,
};


export const schemaTreeRoutes = new Hono()
    .get(
        "/",
        tbValidator("query", SchemaTreeQuerySchema as unknown as TSchema),
        async (c) => {
            const query = c.req.valid("query") as {archive_id: string};
            // eslint-disable-next-line camelcase
            const {archive_id} = query;

            return c.json({
                // eslint-disable-next-line camelcase
                archiveId: archive_id,
                tree: MOCK_SCHEMA_TREE,
            });
        },
    );

export type SchemaTreeRoutesType = typeof schemaTreeRoutes;
