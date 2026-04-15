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
import {streamFilesRoutes} from "./stream-files.js";


describe("Stream Files Routes", () => {
    let app: OpenAPIHono<Env>;
    let mockGetMetadata: ReturnType<typeof vi.fn>;
    let mockSubmitExtract: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockGetMetadata = vi.fn();
        mockSubmitExtract = vi.fn();

        app = new OpenAPIHono<Env>();

        app.use("/*", async (c, next) => {
            c.set("queryJobDbManager", {} as any);
            c.set("compressionJobDbManager", {} as any);
            c.set("streamFileManager", {
                getExtractedStreamFileMetadata: mockGetMetadata,
                submitAndWaitForExtractStreamJob: mockSubmitExtract,
            } as any);
            c.set("s3Manager", null);
            c.set("prestoClient", null);
            c.set("mongoDb", {} as any);
            await next();
        });

        app.route("/", streamFilesRoutes);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("POST /extract", () => {
        it("should return empty response for non-extract job type", async () => {
            const res = await app.request("/extract", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    streamId: "stream-1",
                    logEventIdx: 10,
                    extractJobType: 0, // SEARCH_OR_AGGREGATION
                    dataset: "default",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({
                begin_msg_ix: 0,
                end_msg_ix: 0,
                is_last_chunk: false,
                path: "",
                stream_id: "",
            });
        });

        it("should return existing metadata if already extracted", async () => {
            const mockMetadata = {
                stream_id: "stream-1",
                begin_msg_ix: 0,
                end_msg_ix: 100,
                is_last_chunk: true,
                path: "/extracted/stream-1",
            };

            mockGetMetadata.mockResolvedValue(mockMetadata);

            const res = await app.request("/extract", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    streamId: "stream-1",
                    logEventIdx: 50,
                    extractJobType: 1, // EXTRACT_IR
                    dataset: "default",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.path).toBe("/streams//extracted/stream-1");
            expect(data.stream_id).toBe("stream-1");
            expect(data.begin_msg_ix).toBe(0);
            expect(data.end_msg_ix).toBe(100);
        });

        it("should submit extraction job if metadata not found", async () => {
            mockGetMetadata
                .mockResolvedValueOnce(null) // first call: not found
                .mockResolvedValueOnce({ // second call: after extraction
                    stream_id: "stream-1",
                    begin_msg_ix: 0,
                    end_msg_ix: 100,
                    is_last_chunk: true,
                    path: "/extracted/stream-1",
                });
            mockSubmitExtract.mockResolvedValue(42);

            const res = await app.request("/extract", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    streamId: "stream-1",
                    logEventIdx: 50,
                    extractJobType: 1, // EXTRACT_IR
                    dataset: "default",
                }),
            });

            expect(res.status).toBe(200);
            expect(mockSubmitExtract).toHaveBeenCalledOnce();
        });

        it("should return empty response if extraction job fails", async () => {
            mockGetMetadata.mockResolvedValue(null);
            mockSubmitExtract.mockResolvedValue(null);

            const res = await app.request("/extract", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    streamId: "stream-1",
                    logEventIdx: 50,
                    extractJobType: 1, // EXTRACT_IR
                    dataset: "default",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.path).toBe("");
        });

        it("should return empty response if metadata still not found after extraction", async () => {
            mockGetMetadata
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);
            mockSubmitExtract.mockResolvedValue(42);

            const res = await app.request("/extract", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    streamId: "stream-1",
                    logEventIdx: 50,
                    extractJobType: 2, // EXTRACT_JSON
                    dataset: "default",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.path).toBe("");
        });

        it("should use S3 pre-signed URL when s3Manager is configured", async () => {
            const mockMetadata = {
                stream_id: "stream-1",
                begin_msg_ix: 0,
                end_msg_ix: 100,
                is_last_chunk: true,
                path: "s3://bucket/extracted/stream-1",
            };

            mockGetMetadata.mockResolvedValue(mockMetadata);

            // Reconfigure with S3 manager
            const s3App = new OpenAPIHono<Env>();
            const mockGetPreSignedUrl = vi.fn().mockResolvedValue("https://s3.example.com/presigned");
            s3App.use("/*", async (c, next) => {
                c.set("queryJobDbManager", {} as any);
                c.set("compressionJobDbManager", {} as any);
                c.set("streamFileManager", {
                    getExtractedStreamFileMetadata: mockGetMetadata,
                    submitAndWaitForExtractStreamJob: mockSubmitExtract,
                } as any);
                c.set("s3Manager", {
                    getS3PathPrefix: () => "s3://bucket/",
                    getPreSignedUrl: mockGetPreSignedUrl,
                } as any);
                c.set("prestoClient", null);
                c.set("mongoDb", {} as any);
                await next();
            });
            s3App.route("/", streamFilesRoutes);

            const res = await s3App.request("/extract", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    streamId: "stream-1",
                    logEventIdx: 50,
                    extractJobType: 1, // EXTRACT_IR
                    dataset: "default",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.path).toBe("https://s3.example.com/presigned");
            expect(mockGetPreSignedUrl).toHaveBeenCalledWith("s3://bucket/extracted/stream-1");
        });
    });
});
