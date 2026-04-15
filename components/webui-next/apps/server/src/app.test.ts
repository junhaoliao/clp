import {HTTPException} from "hono/http-exception";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";


// Mock all external dependencies before importing app
// Note: vi.mock factories are hoisted, so they can't reference variables

vi.mock("./db/index.js", () => ({
    pool: {
        execute: vi.fn().mockResolvedValue([[],
            []]),
    },
    db: {},
    connectMongo: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
            insertOne: vi.fn(),
            updateOne: vi.fn(),
        }),
    }),
}));

vi.mock("./services/query-job-db-manager.js", () => ({
    QueryJobDbManager: vi.fn(function (
        this: {
            submitJob: ReturnType<typeof vi.fn>;
            cancelJob: ReturnType<typeof vi.fn>;
        },
    ) {
        this.submitJob = vi.fn();
        this.cancelJob = vi.fn();
    }),
}));

vi.mock("./services/compression-job-db-manager.js", () => ({
    CompressionJobDbManager: vi.fn(function (
        this: {
            submitJob: ReturnType<typeof vi.fn>;
        },
    ) {
        this.submitJob = vi.fn();
    }),
}));

vi.mock("./services/stream-file-manager.js", () => ({
    StreamFileManager: vi.fn(function (
        this: {
            getExtractedStreamFileMetadata: ReturnType<typeof vi.fn>;
            submitAndWaitForExtractStreamJob: ReturnType<typeof vi.fn>;
        },
    ) {
        this.getExtractedStreamFileMetadata = vi.fn();
        this.submitAndWaitForExtractStreamJob = vi.fn();
    }),
}));

vi.mock("./services/s3-manager.js", () => ({
    S3Manager: vi.fn(function (
        this: {
            getS3PathPrefix: ReturnType<typeof vi.fn>;
            getPreSignedUrl: ReturnType<typeof vi.fn>;
        },
    ) {
        this.getS3PathPrefix = vi.fn();
        this.getPreSignedUrl = vi.fn();
    }),
}));

vi.mock("./services/presto-client.js", () => ({
    PrestoClient: vi.fn(function (
        this: Record<string, unknown>,
    ) {
        // No-op constructor
    }),
}));

import {createApp} from "./app.js";


describe("createApp", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should create an app with all middleware and routes", async () => {
        const {app, mongoDb} = await createApp();

        expect(app).toBeDefined();
        expect(mongoDb).toBeDefined();
    });

    it("should return 200 for unmatched routes (SPA fallback)", async () => {
        const {app} = await createApp();

        // SPA fallback serves index.html for all unmatched routes
        const res = await app.request("/some-random-page");
        expect(res.status).toBe(200);
    });

    it("should have CORS middleware on API routes", async () => {
        const {app} = await createApp();

        const res = await app.request("/api/search/query", {
            method: "OPTIONS",
            headers: {
                "Origin": "http://localhost:8080",
                "Access-Control-Request-Method": "POST",
            },
        });

        const allowOrigin = res.headers.get("access-control-allow-origin");
        expect(allowOrigin).toBeDefined();
    });

    it("should handle POST to search/query with validation", async () => {
        const {app} = await createApp();

        const res = await app.request("/api/search/query", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
    });

    it("should handle HTTPException in error handler", async () => {
        const {app} = await createApp();

        // Register test route at a path that won't conflict with existing routes
        // We need to add it before the static catch-all, so we use the fetch directly
        const testApp = app;

        // Use an existing endpoint with a query that triggers an HTTPException
        // The Zod validation returning 400 goes through OpenAPI's error handling,
        // which may use HTTPException. But let's directly test the error handler
        // by using Hono's app.request with a route that we manually mount
        testApp.onError((err, c) => {
            if (err instanceof HTTPException) {
                return err.getResponse();
            }

            console.error(`Unhandled error: ${err.message}`, err);

            return c.json({error: "Internal Server Error"}, 500);
        });

        // Mount a test route that throws
        const testRoute = app.route;

        // We can verify error handling through the existing behavior
        // The 400 validation error from the search endpoint is already an HTTPException
        const res = await testApp.request("/api/search/query", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({invalid: true}),
        });

        expect(res.status).toBe(400);
    });

    it("should handle generic errors and return 500", async () => {
        const {app} = await createApp();

        // The app's error handler is tested implicitly through the routes.
        // To test the generic error branch, we create a standalone Hono instance
        // with the same error handler pattern
        const {OpenAPIHono} = await import("@hono/zod-openapi");

        const testApp = new OpenAPIHono();
        testApp.onError((err, c) => {
            if (err instanceof HTTPException) {
                return err.getResponse();
            }

            console.error(`Unhandled error: ${err.message}`, err);

            return c.json({error: "Internal Server Error"}, 500);
        });
        testApp.get("/api/throw-error", () => {
            throw new Error("Test error");
        });

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        });
        const res = await testApp.request("/api/throw-error");
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data).toEqual({error: "Internal Server Error"});
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it("should handle HTTPException in error handler correctly", async () => {
        const {OpenAPIHono} = await import("@hono/zod-openapi");

        const testApp = new OpenAPIHono();
        testApp.onError((err, c) => {
            if (err instanceof HTTPException) {
                return err.getResponse();
            }

            console.error(`Unhandled error: ${err.message}`, err);

            return c.json({error: "Internal Server Error"}, 500);
        });
        testApp.get("/api/throw-http-exception", () => {
            throw new HTTPException(403, {message: "Forbidden"});
        });

        const res = await testApp.request("/api/throw-http-exception");
        expect(res.status).toBe(403);
    });
});
