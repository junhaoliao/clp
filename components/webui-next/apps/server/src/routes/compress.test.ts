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


// Mock the config module before importing routes
vi.mock("../lib/config.js", () => ({
    default: {
        LogsInputRootDir: "/mnt/logs",
        ArchiveOutputCompressionLevel: 3,
        ArchiveOutputTargetArchiveSize: 256 * 1024 * 1024,
        ArchiveOutputTargetDictionariesSize: 32 * 1024 * 1024,
        ArchiveOutputTargetEncodedFileSize: 256 * 1024 * 1024,
        ArchiveOutputTargetSegmentSize: 256 * 1024 * 1024,
    },
}));

// Import after mocking
import {compressRoutes} from "./compress.js";


describe("Compress Routes", () => {
    let app: OpenAPIHono<Env>;
    let mockSubmitJob: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockSubmitJob = vi.fn().mockResolvedValue(5);
        app = new OpenAPIHono<Env>();

        app.use("/*", async (c, next) => {
            c.set("queryJobDbManager", {} as any);
            c.set("compressionJobDbManager", {
                submitJob: mockSubmitJob,
            } as any);
            c.set("streamFileManager", {} as any);
            c.set("s3Manager", null);
            c.set("prestoClient", null);
            c.set("mongoDb", {} as any);
            await next();
        });

        app.route("/", compressRoutes);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("POST /", () => {
        it("should submit a compression job and return jobId", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    paths: ["/test/file.log"],
                    dataset: "default",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({jobId: 5});
            expect(mockSubmitJob).toHaveBeenCalledOnce();
        });

        it("should accept optional fields (timestampKey, unstructured)", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    paths: ["/test/file.log"],
                    dataset: "mydataset",
                    timestampKey: "ts",
                    unstructured: true,
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({jobId: 5});

            const callArgs = mockSubmitJob.mock.calls[0][0] as Record<string, unknown>;
            const input = callArgs.input as Record<string, unknown>;
            expect(input.timestamp_key).toBe("ts");
            expect(input.unstructured).toBe(true);
            expect(input.dataset).toBe("mydataset");
        });

        it("should use defaults when optional fields are omitted", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    paths: ["/test/file.log"],
                }),
            });

            expect(res.status).toBe(200);
            const callArgs = mockSubmitJob.mock.calls[0][0] as Record<string, unknown>;
            const input = callArgs.input as Record<string, unknown>;
            expect(input.dataset).toBe("default");
            expect(input.timestamp_key).toBeNull();
            expect(input.unstructured).toBe(false);
        });

        it("should reject invalid input (missing paths)", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });

        it("should translate host paths to container paths by prepending CONTAINER_INPUT_LOGS_ROOT_DIR", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    paths: ["/home/junhao/samples/subdir/file.log"],
                }),
            });

            expect(res.status).toBe(200);
            const callArgs = mockSubmitJob.mock.calls[0][0] as Record<string, unknown>;
            const input = callArgs.input as Record<string, unknown>;
            const pathsToCompress = input.paths_to_compress as string[];

            // Host path gets CONTAINER_INPUT_LOGS_ROOT_DIR prepended
            expect(pathsToCompress[0]).toBe("/mnt/logs/home/junhao/samples/subdir/file.log");
        });

        it("should use container paths as-is when they already start with CONTAINER_INPUT_LOGS_ROOT_DIR", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    paths: ["/mnt/logs/subdir/file.log"],
                }),
            });

            expect(res.status).toBe(200);
            const callArgs = mockSubmitJob.mock.calls[0][0] as Record<string, unknown>;
            const input = callArgs.input as Record<string, unknown>;
            const pathsToCompress = input.paths_to_compress as string[];

            // Already a container path - used as-is
            expect(pathsToCompress[0]).toBe("/mnt/logs/subdir/file.log");
        });
    });
});
