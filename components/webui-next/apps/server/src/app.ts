import {CLP_QUERY_ENGINES} from "@clp/webui-shared";
import {OpenAPIHono} from "@hono/zod-openapi";
import {cors} from "hono/cors";
import {HTTPException} from "hono/http-exception";
import {rateLimiter} from "hono-rate-limiter";

import settings from "../settings.json" with {type: "json"};
import {
    connectMongo,
    pool,
} from "./db/index.js";
import type {Env} from "./env.js";
import {CompressionJobDbManager} from "./services/compression-job-db-manager.js";
import {PrestoClient} from "./services/presto-client.js";
import {QueryJobDbManager} from "./services/query-job-db-manager.js";
import {S3Manager} from "./services/s3-manager.js";
import {StreamFileManager} from "./services/stream-file-manager.js";


const DEFAULT_PRESTO_CATALOG = "clp";
const DEFAULT_PRESTO_SCHEMA = "default";
const DEFAULT_PRESTO_USER = "clp-webui";
const DEFAULT_RATE_LIMIT = 1000;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Creates and configures the Hono application with all middleware and routes.
 *
 * @return The configured app and MongoDB instance.
 */
const createApp = async () => {
    const app = new OpenAPIHono<Env>();
    const mongoDb = await connectMongo();
    const queryJobDbManager = new QueryJobDbManager(pool, settings.SqlDbQueryJobsTableName);
    const compressionJobDbManager = new CompressionJobDbManager(
        pool,
        settings.SqlDbCompressionJobsTableName,
    );
    const streamFilesCollection = mongoDb.collection(
        settings.MongoDbStreamFilesCollectionName,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @stylistic/max-len
    const streamFileManager = new StreamFileManager(queryJobDbManager, streamFilesCollection as any);

    // Optional: S3 manager
    let s3Manager: S3Manager | null = null;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (settings.StreamFilesS3Region) {
        s3Manager = new S3Manager(
            settings.StreamFilesS3Region,
            settings.StreamFilesS3PathPrefix,
            // eslint-disable-next-line no-undefined, @typescript-eslint/no-unnecessary-condition
            settings.StreamFilesS3Profile ?? undefined,
        );
    }

    // Optional: Presto client
    let prestoClient: PrestoClient | null = null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (settings.ClpQueryEngine === CLP_QUERY_ENGINES.PRESTO) {
        prestoClient = new PrestoClient({
            catalog: process.env.PRESTO_CATALOG ?? DEFAULT_PRESTO_CATALOG,
            host: settings.PrestoHost,
            port: settings.PrestoPort,
            schema: process.env.PRESTO_SCHEMA ?? DEFAULT_PRESTO_SCHEMA,
            user: process.env.USER ?? DEFAULT_PRESTO_USER,
        });
    }

    app.use("/api/*", cors());
    app.use("/api/*", rateLimiter({
        limit: Number(process.env.RATE_LIMIT ?? DEFAULT_RATE_LIMIT),
        windowMs: RATE_LIMIT_WINDOW_MS,
        keyGenerator: (c) => c.req.header("x-forwarded-for") ??
            c.req.header("x-real-ip") ??
            "unknown",
    }));

    app.use("/api/*", async (c, next) => {
        c.set("queryJobDbManager", queryJobDbManager);
        c.set("compressionJobDbManager", compressionJobDbManager);
        c.set("streamFileManager", streamFileManager);
        c.set("s3Manager", s3Manager);
        c.set("prestoClient", prestoClient);
        c.set("mongoDb", mongoDb);
        await next();
    });

    const {default: routes} = await import("./routes/index.js");
    app.route("/", routes);

    app.onError((err, c) => {
        if (err instanceof HTTPException) {
            return err.getResponse();
        }
        console.error(`Unhandled error: ${err.message}`, err);

        return c.json({error: "Internal Server Error"}, HTTP_STATUS_INTERNAL_SERVER_ERROR);
    });

    return {app, mongoDb};
};

export {createApp};
