import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {CompressionJobDbManager} from "./compression-job-db-manager.js";


/**
 *
 */
function createMockPool () {
    return {
        execute: vi.fn(),
    } as any;
}

describe("CompressionJobDbManager", () => {
    let pool: ReturnType<typeof createMockPool>;
    let manager: CompressionJobDbManager;

    beforeEach(() => {
        pool = createMockPool();
        manager = new CompressionJobDbManager(pool, "compression_jobs");
    });

    describe("submitJob", () => {
        it("should compress config with brotli and return insert ID", async () => {
            pool.execute.mockResolvedValue([{insertId: 10},
                undefined]);
            const jobConfig = {
                input: {type: "fs", paths: ["/test"]},
                output: {compression_level: 3},
            };

            const result = await manager.submitJob(jobConfig as any);

            expect(result).toBe(10);
            expect(pool.execute).toHaveBeenCalledOnce();
            const [sql, params] = pool.execute.mock.calls[0];
            expect(sql).toContain("compression_jobs");

            // First param should be brotli-compressed msgpack data
            expect(params[0]).toBeInstanceOf(Buffer);
        });
    });

    describe("getCompressionMetadata", () => {
        it("should return rows from the database", async () => {
            const mockRows = [
                {id: 1, status: 2, clp_config: Buffer.from("test")},
            ];

            pool.execute.mockResolvedValue([mockRows,
                undefined]);

            const result = await manager.getCompressionMetadata();
            expect(result).toEqual(mockRows);
            expect(pool.execute).toHaveBeenCalledOnce();
            const [sql] = pool.execute.mock.calls[0];
            expect(sql).toContain("compression_jobs");
            expect(sql).toContain("ORDER BY");
        });
    });

    describe("decodeJobConfig", () => {
        it("should decompress and decode brotli+msgpack config", async () => {
            const {encode} = await import("@msgpack/msgpack");
            const {brotliCompressSync} = await import("node:zlib");

            const original = {input: {type: "fs"}, output: {level: 3}};
            const compressed = brotliCompressSync(Buffer.from(encode(original)));

            const result = CompressionJobDbManager.decodeJobConfig(
                Buffer.from(compressed),
            );

            expect(result).toEqual(original);
        });
    });
});
