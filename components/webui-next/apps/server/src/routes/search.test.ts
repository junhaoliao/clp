import {OpenAPIHono} from "@hono/zod-openapi";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type {Env} from "../env.js";


// Mock config before importing routes
vi.mock("../lib/config.js", () => ({
    default: {
        MongoDbSearchResultsMetadataCollectionName: "search_results_metadata",
        ClpQueryEngine: "clp",
        LogsInputRootDir: "/logs",
    },
}));

// Mock db/index.js so the search route can query datasets
vi.mock("../db/index.js", () => ({
    pool: {
        execute: vi.fn().mockResolvedValue([[{name: "default"}],
            []]),
    },
}));

import {searchRoutes} from "./search.js";


describe("Search Routes", () => {
    let app: OpenAPIHono<Env>;
    let mockSubmitJob: ReturnType<typeof vi.fn>;
    let mockCancelJob: ReturnType<typeof vi.fn>;
    let mockCreateCollection: ReturnType<typeof vi.fn>;
    let mockDropCollection: ReturnType<typeof vi.fn>;
    let mockCollection: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockSubmitJob = vi.fn();
        mockCancelJob = vi.fn();
        mockCreateCollection = vi.fn().mockResolvedValue(undefined);
        mockDropCollection = vi.fn().mockResolvedValue(undefined);
        mockCollection = vi.fn().mockReturnValue({
            insertOne: vi.fn().mockResolvedValue(undefined),
            updateOne: vi.fn().mockResolvedValue(undefined),
        });

        app = new OpenAPIHono<Env>();

        app.use("/*", async (c, next) => {
            c.set("queryJobDbManager", {
                submitJob: mockSubmitJob,
                cancelJob: mockCancelJob,
            } as any);
            c.set("compressionJobDbManager", {} as any);
            c.set("streamFileManager", {} as any);
            c.set("s3Manager", null);
            c.set("prestoClient", null);
            c.set("mongoDb", {
                createCollection: mockCreateCollection,
                dropCollection: mockDropCollection,
                collection: mockCollection,
            } as any);
            await next();
        });

        app.route("/", searchRoutes);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("POST /query", () => {
        it("should submit search and aggregation jobs", async () => {
            mockSubmitJob
                .mockResolvedValueOnce(1) // search job
                .mockResolvedValueOnce(2); // aggregation job

            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    queryString: "test query",
                    timestampBegin: 0,
                    timestampEnd: 1000,
                    datasets: ["default"],
                    ignoreCase: false,
                    timeRangeBucketSizeMillis: 1000,
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({searchJobId: 1, aggregationJobId: 2});
            expect(mockSubmitJob).toHaveBeenCalledTimes(2);
            expect(mockCreateCollection).toHaveBeenCalledTimes(2);
        });

        it("should reject invalid input", async () => {
            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });

        it("should resolve datasets from DB when empty array provided", async () => {
            mockSubmitJob
                .mockResolvedValueOnce(10)
                .mockResolvedValueOnce(20);

            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    queryString: "test",
                    timestampBegin: 0,
                    timestampEnd: 1000,
                    datasets: [],
                    ignoreCase: true,
                    timeRangeBucketSizeMillis: 1000,
                }),
            });

            expect(res.status).toBe(200);

            // Verify datasets was resolved from DB (mock returns ["default"])
            const callArgs = mockSubmitJob.mock.calls[0][0] as Record<string, unknown>;
            expect(callArgs.datasets).toEqual(["default"]);
        });

        it("should pass null datasets when DB returns empty list", async () => {
            // Override the db mock to return empty dataset list
            const {pool} = await import("../db/index.js");
            vi.mocked(pool.execute).mockResolvedValueOnce([[],
                []] as any);

            mockSubmitJob
                .mockResolvedValueOnce(30)
                .mockResolvedValueOnce(40);

            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    queryString: "test",
                    timestampBegin: 0,
                    timestampEnd: 1000,
                    datasets: [],
                    ignoreCase: false,
                    timeRangeBucketSizeMillis: 1000,
                }),
            });

            expect(res.status).toBe(200);
            const callArgs = mockSubmitJob.mock.calls[0][0] as Record<string, unknown>;
            expect(callArgs.datasets).toBeNull();
        });
    });

    describe("DELETE /results", () => {
        it("should drop search and aggregation collections", async () => {
            const res = await app.request("/results", {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    searchJobId: "1",
                    aggregationJobId: "2",
                }),
            });

            expect(res.status).toBe(204);
            expect(mockDropCollection).toHaveBeenCalledTimes(2);
        });

        it("should handle missing collections gracefully", async () => {
            mockDropCollection.mockRejectedValue(new Error("ns not found"));

            const res = await app.request("/results", {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    searchJobId: "1",
                    aggregationJobId: "2",
                }),
            });

            expect(res.status).toBe(204);
        });
    });

    describe("POST /cancel", () => {
        it("should cancel both jobs", async () => {
            const res = await app.request("/cancel", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    searchJobId: 1,
                    aggregationJobId: 2,
                }),
            });

            expect(res.status).toBe(204);
            expect(mockCancelJob).toHaveBeenCalledTimes(2);
        });
    });
});
