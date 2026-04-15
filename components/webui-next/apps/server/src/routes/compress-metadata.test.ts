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
import {compressMetadataRoutes} from "./compress-metadata.js";


describe("Compress Metadata Routes", () => {
    let app: OpenAPIHono<Env>;
    let mockGetMetadata: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockGetMetadata = vi.fn();
        app = new OpenAPIHono<Env>();

        app.use("/*", async (c, next) => {
            c.set("queryJobDbManager", {} as any);
            c.set("compressionJobDbManager", {
                getCompressionMetadata: mockGetMetadata,
            } as any);
            c.set("streamFileManager", {} as any);
            c.set("s3Manager", null);
            c.set("prestoClient", null);
            c.set("mongoDb", {} as any);
            await next();
        });

        app.route("/", compressMetadataRoutes);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("GET /", () => {
        it("should return decoded compression metadata", async () => {
            const {encode} = await import("@msgpack/msgpack");
            const {brotliCompressSync} = await import("node:zlib");

            const originalConfig = {input: {type: "fs"}, output: {level: 3}};
            const compressed = brotliCompressSync(Buffer.from(encode(originalConfig)));

            mockGetMetadata.mockResolvedValue([
                {id: 1, status: 2, clp_config: Buffer.from(compressed)},
            ]);

            const res = await app.request("/");

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toHaveLength(1);
            expect(data[0].id).toBe(1);
            expect(data[0].clp_config).toEqual(originalConfig);
        });

        it("should return empty array when no jobs exist", async () => {
            mockGetMetadata.mockResolvedValue([]);

            const res = await app.request("/");

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual([]);
        });
    });
});
