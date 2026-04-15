import {QUERY_JOB_TYPE} from "@clp/webui-shared";
import {encode} from "@msgpack/msgpack";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {QueryJobDbManager} from "./query-job-db-manager.js";


/**
 *
 */
function createMockPool () {
    return {
        execute: vi.fn(),
        query: vi.fn(),
    } as any;
}

describe("QueryJobDbManager", () => {
    let pool: ReturnType<typeof createMockPool>;
    let manager: QueryJobDbManager;

    beforeEach(() => {
        pool = createMockPool();
        manager = new QueryJobDbManager(pool, "query_jobs");
    });

    describe("submitJob", () => {
        it("should insert a job with encoded config and return the insert ID", async () => {
            const jobConfig = {query_string: "test", ignore_case: false};
            pool.execute.mockResolvedValue([{insertId: 42},
                undefined]);

            const result = await manager.submitJob(jobConfig, QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION);

            expect(result).toBe(42);
            expect(pool.execute).toHaveBeenCalledOnce();
            const [sql, params] = pool.execute.mock.calls[0];
            expect(sql).toContain("query_jobs");
            expect(params[0]).toBe(QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION);

            // Second param should be the msgpack-encoded config
            expect(Buffer.compare(
                params[1],
                Buffer.from(encode(jobConfig)),
            )).toBe(0);
        });

        it("should handle EXTRACT_IR job type", async () => {
            pool.execute.mockResolvedValue([{insertId: 99},
                undefined]);
            const result = await manager.submitJob({}, QUERY_JOB_TYPE.EXTRACT_IR);
            expect(result).toBe(99);
            const params = pool.execute.mock.calls[0][1];
            expect(params[0]).toBe(QUERY_JOB_TYPE.EXTRACT_IR);
        });
    });

    describe("cancelJob", () => {
        it("should update status with CANCELLING value for waiting states", async () => {
            pool.execute.mockResolvedValue([{affectedRows: 1},
                undefined]);
            await manager.cancelJob(42);
            expect(pool.execute).toHaveBeenCalledOnce();
            const [sql, params] = pool.execute.mock.calls[0];
            expect(sql).toContain("status");
            expect(sql).toContain("query_jobs");
            expect(params[0]).toBe(4); // QUERY_JOB_STATUS.CANCELLING
            expect(params[1]).toBe(42);
        });
    });

    describe("getJobStatus", () => {
        it("should return the status when job exists", async () => {
            pool.execute.mockResolvedValue([[{status: 2}],
                undefined]);
            const status = await manager.getJobStatus(1);
            expect(status).toBe(2);
        });

        it("should return null when job does not exist", async () => {
            pool.execute.mockResolvedValue([[],
                undefined]);
            const status = await manager.getJobStatus(999);
            expect(status).toBeNull();
        });
    });

    describe("awaitJobCompletion", () => {
        it("should resolve immediately if job is in terminal state", async () => {
            pool.execute.mockResolvedValue([[{status: 2}],
                undefined]);
            const status = await manager.awaitJobCompletion(1);
            expect(status).toBe(2);
        });

        it("should throw if job not found", async () => {
            pool.execute.mockResolvedValue([[],
                undefined]);
            await expect(manager.awaitJobCompletion(1)).rejects.toThrow("not found");
        });

        it("should poll until terminal state", async () => {
            pool.execute
                .mockResolvedValueOnce([[{status: 1}],
                    undefined]) // RUNNING
                .mockResolvedValueOnce([[{status: 2}],
                    undefined]); // SUCCEEDED

            // Use fake timers to avoid actual 500ms wait
            vi.useFakeTimers();
            const promise = manager.awaitJobCompletion(1);
            await vi.advanceTimersByTimeAsync(600);
            const status = await promise;
            expect(status).toBe(2);
            vi.useRealTimers();
        });
    });

    describe("submitAndWaitForJob", () => {
        it("should submit and wait for completion", async () => {
            pool.execute
                .mockResolvedValueOnce([{insertId: 7},
                    undefined])
                .mockResolvedValue([[{status: 2}],
                    undefined]);

            const result = await manager.submitAndWaitForJob(
                {query: "test"},
                QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION,
            );

            expect(result).toEqual({jobId: 7, status: 2});
        });
    });
});
