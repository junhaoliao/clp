import {OpenAPIHono} from "@hono/zod-openapi";
import type {Db} from "mongodb";
import {vi} from "vitest";

import type {Env} from "../env.js";
import type {CompressionJobDbManager} from "../services/compression-job-db-manager.js";
import type {PrestoClient} from "../services/presto-client.js";
import type {QueryJobDbManager} from "../services/query-job-db-manager.js";
import type {S3Manager} from "../services/s3-manager.js";
import type {StreamFileManager} from "../services/stream-file-manager.js";


/**
 *
 */
function createMockServices () {
    return {
        queryJobDbManager: {
            submitJob: vi.fn(),
            cancelJob: vi.fn(),
            getJobStatus: vi.fn(),
            awaitJobCompletion: vi.fn(),
            submitAndWaitForJob: vi.fn(),
        } as any as QueryJobDbManager,
        compressionJobDbManager: {
            submitJob: vi.fn(),
            getCompressionMetadata: vi.fn(),
        } as any as CompressionJobDbManager,
        streamFileManager: {
            getExtractedStreamFileMetadata: vi.fn(),
            submitAndWaitForExtractStreamJob: vi.fn(),
        } as any as StreamFileManager,
        s3Manager: null as S3Manager | null,
        prestoClient: null as PrestoClient | null,
        mongoDb: {
            createCollection: vi.fn(),
            dropCollection: vi.fn(),
            collection: vi.fn(),
            listCollections: vi.fn(),
        } as any as Db,
    };
}

type MockServices = ReturnType<typeof createMockServices>;

/**
 *
 * @param services
 */
function createTestApp (services: MockServices) {
    const app = new OpenAPIHono<Env>();

    // Inject mock services
    app.use("/api/*", async (c, next) => {
        c.set("queryJobDbManager", services.queryJobDbManager);
        c.set("compressionJobDbManager", services.compressionJobDbManager);
        c.set("streamFileManager", services.streamFileManager);
        c.set("s3Manager", services.s3Manager);
        c.set("prestoClient", services.prestoClient);
        c.set("mongoDb", services.mongoDb);
        await next();
    });

    return app;
}

export {
    createMockServices, createTestApp,
};
export type {MockServices};
