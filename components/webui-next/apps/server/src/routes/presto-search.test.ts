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


vi.mock("../lib/config.js", () => ({
    default: {
        MongoDbSearchResultsMetadataCollectionName: "search_results_metadata",
        ClpQueryEngine: "presto",
    },
}));

import {prestoSearchRoutes} from "./presto-search.js";


describe("Presto Search Routes", () => {
    let app: OpenAPIHono<Env>;
    let mockPrestoExecute: ReturnType<typeof vi.fn>;
    let mockPrestoKill: ReturnType<typeof vi.fn>;
    let mockMongoDb: any;

    beforeEach(() => {
        mockPrestoExecute = vi.fn();
        mockPrestoKill = vi.fn();
        mockMongoDb = {
            createCollection: vi.fn().mockResolvedValue(undefined),
            dropCollection: vi.fn().mockResolvedValue(undefined),
            collection: vi.fn().mockReturnValue({
                updateOne: vi.fn().mockResolvedValue(undefined),
                insertMany: vi.fn().mockResolvedValue(undefined),
            }),
        };

        app = new OpenAPIHono<Env>();

        app.use("/*", async (c, next) => {
            c.set("queryJobDbManager", {} as any);
            c.set("compressionJobDbManager", {} as any);
            c.set("streamFileManager", {} as any);
            c.set("s3Manager", null);
            c.set("mongoDb", mockMongoDb);

            // Default: presto enabled
            if ("/query" === c.req.path || "/cancel" === c.req.path) {
                c.set("prestoClient", {
                    execute: mockPrestoExecute,
                    kill: mockPrestoKill,
                } as any);
            } else {
                c.set("prestoClient", {
                    execute: mockPrestoExecute,
                    kill: mockPrestoKill,
                } as any);
            }

            await next();
        });

        app.route("/", prestoSearchRoutes);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("POST /query", () => {
        it("should submit a presto query and return searchJobId", async () => {
            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    queryString: "SELECT * FROM table",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.searchJobId).toMatch(/^presto-\d+$/);
            expect(mockPrestoExecute).toHaveBeenCalledOnce();
            expect(mockMongoDb.createCollection).toHaveBeenCalledOnce();
        });

        it("should reject missing queryString", async () => {
            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });

        it("should invoke onData callback to insert rows into mongo", async () => {
            mockPrestoExecute.mockImplementation((_query: string, callbacks: any) => {
                callbacks.onData([["value1"],
                    ["value2"]], [{name: "col1"}]);
            });

            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({queryString: "SELECT 1"}),
            });

            expect(res.status).toBe(200);

            // insertPrestoRowsToMongo should have been called via the callback
            expect(mockMongoDb.collection).toHaveBeenCalled();
        });

        it("should invoke onSuccess callback to set DONE signal", async () => {
            const mockUpdateOne = vi.fn().mockResolvedValue(undefined);
            mockMongoDb.collection.mockReturnValue({updateOne: mockUpdateOne});
            mockPrestoExecute.mockImplementation((_query: string, callbacks: any) => {
                callbacks.onSuccess();
            });

            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({queryString: "SELECT 1"}),
            });

            expect(res.status).toBe(200);
            expect(mockUpdateOne).toHaveBeenCalled();
        });

        it("should invoke onError callback to set FAILED signal", async () => {
            const mockUpdateOne = vi.fn().mockResolvedValue(undefined);
            mockMongoDb.collection.mockReturnValue({updateOne: mockUpdateOne});
            mockPrestoExecute.mockImplementation((_query: string, callbacks: any) => {
                callbacks.onError({message: "query failed", name: "PrestoError"});
            });

            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({queryString: "SELECT 1"}),
            });

            expect(res.status).toBe(200);
            expect(mockUpdateOne).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    $set: expect.objectContaining({
                        errorMsg: "query failed",
                        lastSignal: "FAILED",
                    }),
                }),
            );
        });

        it("should invoke onState callback to update metadata", async () => {
            const mockUpdateOne = vi.fn().mockResolvedValue(undefined);
            mockMongoDb.collection.mockReturnValue({updateOne: mockUpdateOne});
            mockPrestoExecute.mockImplementation((_query: string, callbacks: any) => {
                callbacks.onState("query-123", {});
            });

            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({queryString: "SELECT 1"}),
            });

            expect(res.status).toBe(200);
            expect(mockUpdateOne).toHaveBeenCalled();
        });

        it("should return 400 when presto is not configured", async () => {
            // Override: no presto client
            app = new OpenAPIHono<Env>();
            app.use("/*", async (c, next) => {
                c.set("queryJobDbManager", {} as any);
                c.set("compressionJobDbManager", {} as any);
                c.set("streamFileManager", {} as any);
                c.set("s3Manager", null);
                c.set("mongoDb", mockMongoDb);
                c.set("prestoClient", null);
                await next();
            });
            app.route("/", prestoSearchRoutes);

            const res = await app.request("/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({queryString: "SELECT 1"}),
            });

            expect(res.status).toBe(400);
        });
    });

    describe("POST /cancel", () => {
        it("should return 400 when presto is not configured", async () => {
            const noPrestoApp = new OpenAPIHono<Env>();
            noPrestoApp.use("/*", async (c, next) => {
                c.set("queryJobDbManager", {} as any);
                c.set("compressionJobDbManager", {} as any);
                c.set("streamFileManager", {} as any);
                c.set("s3Manager", null);
                c.set("mongoDb", mockMongoDb);
                c.set("prestoClient", null);
                await next();
            });
            noPrestoApp.route("/", prestoSearchRoutes);

            const res = await noPrestoApp.request("/cancel", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({searchJobId: "presto-123"}),
            });

            expect(res.status).toBe(400);
        });
    });

    describe("POST /cancel", () => {
        it("should kill the presto query", async () => {
            const res = await app.request("/cancel", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    searchJobId: "presto-1234567890",
                }),
            });

            expect(res.status).toBe(204);
            expect(mockPrestoKill).toHaveBeenCalledWith("presto-1234567890");
        });
    });

    describe("DELETE /results", () => {
        it("should drop the results collection", async () => {
            const res = await app.request("/results", {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    searchJobId: "presto-1234567890",
                }),
            });

            expect(res.status).toBe(204);
            expect(mockMongoDb.dropCollection).toHaveBeenCalledWith("presto-1234567890");
        });

        it("should handle missing collection gracefully", async () => {
            mockMongoDb.dropCollection.mockRejectedValue(new Error("ns not found"));

            const res = await app.request("/results", {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    searchJobId: "presto-1234567890",
                }),
            });

            expect(res.status).toBe(204);
        });
    });
});
