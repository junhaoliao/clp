import {QUERY_JOB_TYPE} from "@clp/webui-shared";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {StreamFileManager} from "./stream-file-manager.js";


/**
 *
 */
function createMockQueryJobDbManager () {
    return {
        submitAndWaitForJob: vi.fn(),
        submitJob: vi.fn(),
        cancelJob: vi.fn(),
        getJobStatus: vi.fn(),
        awaitJobCompletion: vi.fn(),
    } as any;
}

/**
 *
 */
function createMockCollection () {
    return {
        findOne: vi.fn(),
        find: vi.fn(),
        insertOne: vi.fn(),
        updateOne: vi.fn(),
    } as any;
}

describe("StreamFileManager", () => {
    let queryJobDbManager: ReturnType<typeof createMockQueryJobDbManager>;
    let streamFilesCollection: ReturnType<typeof createMockCollection>;
    let manager: StreamFileManager;

    beforeEach(() => {
        queryJobDbManager = createMockQueryJobDbManager();
        streamFilesCollection = createMockCollection();
        manager = new StreamFileManager(queryJobDbManager, streamFilesCollection);
    });

    describe("getExtractedStreamFileMetadata", () => {
        it("should return metadata when found", async () => {
            const mockMetadata = {
                stream_id: "stream-1",
                begin_msg_ix: 0,
                end_msg_ix: 100,
                is_last_chunk: true,
                path: "/test/path",
            };

            streamFilesCollection.findOne.mockResolvedValue(mockMetadata);

            const result = await manager.getExtractedStreamFileMetadata("stream-1", 50);
            expect(result).toEqual(mockMetadata);
            expect(streamFilesCollection.findOne).toHaveBeenCalledWith({
                stream_id: "stream-1",
                begin_msg_ix: {$lte: 50},
                end_msg_ix: {$gt: 50},
            });
        });

        it("should return null when no metadata found", async () => {
            streamFilesCollection.findOne.mockResolvedValue(null);
            const result = await manager.getExtractedStreamFileMetadata("stream-x", 0);
            expect(result).toBeNull();
        });
    });

    describe("submitAndWaitForExtractStreamJob", () => {
        it("should submit and return job ID on success", async () => {
            queryJobDbManager.submitAndWaitForJob.mockResolvedValue({
                jobId: 42,
                status: 2,
            });

            const result = await manager.submitAndWaitForExtractStreamJob(
                "stream-1",
                50,
                QUERY_JOB_TYPE.EXTRACT_IR,
                "default",
            );

            expect(result).toBe(42);
            expect(queryJobDbManager.submitAndWaitForJob).toHaveBeenCalledWith(
                {dataset: "default", log_event_idx: 50, stream_id: "stream-1"},
                QUERY_JOB_TYPE.EXTRACT_IR,
            );
        });

        it("should return null on failure", async () => {
            queryJobDbManager.submitAndWaitForJob.mockRejectedValue(new Error("fail"));

            const result = await manager.submitAndWaitForExtractStreamJob(
                "stream-1",
                50,
                QUERY_JOB_TYPE.EXTRACT_JSON,
                null,
            );

            expect(result).toBeNull();
        });
    });
});
