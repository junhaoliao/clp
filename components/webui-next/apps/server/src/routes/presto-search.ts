import {
    PRESTO_SEARCH_SIGNAL,
    prestoQueryJobCreationSchema,
    prestoQueryJobSchema,
} from "@clp/webui-shared";
import {
    createRoute,
    OpenAPIHono,
    z,
} from "@hono/zod-openapi";
import {HTTPException} from "hono/http-exception";

import type {Env} from "../env.js";
import {
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_NO_CONTENT,
    HTTP_STATUS_OK,
} from "./presto-search/constants.js";
import {insertPrestoRowsToMongo} from "./presto-search/utils.js";


/**
 * Updates the metadata document for a search job in MongoDB.
 *
 * @param root0
 * @param root0.collectionName
 * @param root0.mongoDb
 * @param root0.searchJobId
 * @param root0.updateFields
 * @param root0.upsert
 * @return
 */
const updatePrestoMetadata = async ({
    collectionName,
    mongoDb,
    searchJobId,
    updateFields,
    upsert = false,
}: {
    collectionName: string;
    mongoDb: Env["Variables"]["mongoDb"];
    searchJobId: string;
    updateFields: Record<string, unknown>;
    upsert?: boolean;
}): Promise<void> => {
    await mongoDb.collection(collectionName)
        .updateOne(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @stylistic/max-len
            {_id: searchJobId as any},
            {$set: updateFields},
            ...(
                upsert ?
                    [{upsert: true}] :
                    []
            ),
        );
};

/**
 * Extracts column names from Presto column metadata.
 *
 * @param columns
 * @return
 */
const extractColumnNames = (columns: Array<{name: string}>): string[] => {
    return columns.map((col) => col.name);
};


/**
 * Submits a Presto query and registers callbacks for state, data, success,
 * and error events.
 *
 * @param root0
 * @param root0.metadataCollectionName
 * @param root0.mongoDb
 * @param root0.prestoClient
 * @param root0.queryString
 * @param root0.searchJobId
 */
const submitPrestoQuery = ({
    metadataCollectionName: collectionName,
    mongoDb,
    prestoClient,
    queryString,
    searchJobId,
}: {
    metadataCollectionName: string;
    mongoDb: Env["Variables"]["mongoDb"];
    prestoClient: NonNullable<Env["Variables"]["prestoClient"]>;
    queryString: string;
    searchJobId: string;
}): void => {
    prestoClient.execute(queryString, {
        onState: () => {
            updatePrestoMetadata({
                collectionName: collectionName,
                mongoDb: mongoDb,
                searchJobId: searchJobId,
                updateFields: {lastSignal: PRESTO_SEARCH_SIGNAL.QUERYING},
                upsert: true,
            }).catch(() => {
            });
        },
        onData: (data, columns) => {
            insertPrestoRowsToMongo(
                data,
                extractColumnNames(columns),
                searchJobId,
                mongoDb,
            ).catch(() => {
            });
        },
        onSuccess: () => {
            updatePrestoMetadata({
                collectionName: collectionName,
                mongoDb: mongoDb,
                searchJobId: searchJobId,
                updateFields: {lastSignal: PRESTO_SEARCH_SIGNAL.DONE},
            }).catch(() => {
            });
        },
        onError: (error) => {
            updatePrestoMetadata({
                collectionName: collectionName,
                mongoDb: mongoDb,
                searchJobId: searchJobId,
                updateFields: {
                    lastSignal: PRESTO_SEARCH_SIGNAL.FAILED,
                    errorMsg: error.message,
                    errorName: (error as Error).name,
                },
            }).catch(() => {
            });
        },
    });
};


const prestoSearchRoutes = new OpenAPIHono<Env>()
    .openapi(
        createRoute({
            method: "post",
            path: "/query",
            request: {
                body: {
                    content: {
                        "application/json": {schema: prestoQueryJobCreationSchema},
                    },
                },
            },
            responses: {
                [HTTP_STATUS_OK]: {
                    content: {
                        "application/json": {
                            schema: z.object({searchJobId: z.string()}),
                        },
                    },
                    description: "Presto query submitted",
                },
            },
        }),
        async (c) => {
            const {prestoClient, mongoDb} = c.var;
            if (!prestoClient) {
                throw new HTTPException(
                    HTTP_STATUS_BAD_REQUEST,
                    {message: "Presto not configured"},
                );
            }

            const {queryString} = c.req.valid("json");
            const searchJobId = `presto-${Date.now()}`;
            const settings = (await import("../lib/config.js")).default;
            const metadataCollectionName =
                settings.MongoDbSearchResultsMetadataCollectionName;

            await mongoDb.createCollection(searchJobId);

            submitPrestoQuery({
                metadataCollectionName,
                mongoDb,
                prestoClient,
                queryString,
                searchJobId,
            });

            return c.json(
                {searchJobId} as const,
                HTTP_STATUS_OK,
            );
        },
    )
    .openapi(
        createRoute({
            method: "post",
            path: "/cancel",
            request: {
                body: {
                    content: {
                        "application/json": {schema: prestoQueryJobSchema},
                    },
                },
            },
            responses: {
                [HTTP_STATUS_NO_CONTENT]: {description: "Query cancelled"},
            },
        }),
        (c) => {
            const {prestoClient} = c.var;
            if (!prestoClient) {
                throw new HTTPException(
                    HTTP_STATUS_BAD_REQUEST,
                    {message: "Presto not configured"},
                );
            }

            const {searchJobId} = c.req.valid("json");
            prestoClient.kill(searchJobId);

            return c.body(null, HTTP_STATUS_NO_CONTENT);
        },
    )
    .openapi(
        createRoute({
            method: "delete",
            path: "/results",
            request: {
                body: {
                    content: {
                        "application/json": {schema: prestoQueryJobSchema},
                    },
                },
            },
            responses: {
                [HTTP_STATUS_NO_CONTENT]: {description: "Results cleared"},
            },
        }),
        async (c) => {
            const {mongoDb} = c.var;
            const {searchJobId} = c.req.valid("json");

            await mongoDb.dropCollection(searchJobId).catch(() => {
            });

            return c.body(null, HTTP_STATUS_NO_CONTENT);
        },
    );

export {prestoSearchRoutes};
