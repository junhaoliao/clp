import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    createMongoIndexes,
    hasCollection,
    updateSearchSignalWhenJobsFinish,
} from "./utils.js";


describe("search/utils", () => {
    describe("hasCollection", () => {
        it("should return true when collection exists", async () => {
            const mockDb = {
                listCollections: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([{name: "test-col"}]),
                }),
            } as any;

            const result = await hasCollection(mockDb, "test-col");
            expect(result).toBe(true);
        });

        it("should return false when collection does not exist", async () => {
            const mockDb = {
                listCollections: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([]),
                }),
            } as any;

            const result = await hasCollection(mockDb, "nonexistent");
            expect(result).toBe(false);
        });
    });

    describe("updateSearchSignalWhenJobsFinish", () => {
        it("should update metadata with RESP_DONE and result count", async () => {
            const mockUpdateOne = vi.fn().mockResolvedValue(undefined);
            const mockCountDocuments = vi.fn().mockResolvedValue(500);
            const mockDb = {
                listCollections: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([{name: "1"}]),
                }),
                collection: vi.fn().mockReturnValue({
                    countDocuments: mockCountDocuments,
                    updateOne: mockUpdateOne,
                }),
            } as any;

            const mockAwaitJob = vi.fn().mockResolvedValue(2);
            const mockQueryJobDbManager = {
                awaitJobCompletion: mockAwaitJob,
            } as any;

            await updateSearchSignalWhenJobsFinish({
                searchJobId: 1,
                aggregationJobId: 2,
                queryJobDbManager: mockQueryJobDbManager,
                mongoDb: mockDb,
                metadataCollectionName: "metadata",
            });

            expect(mockAwaitJob).toHaveBeenCalledTimes(2);
            expect(mockCountDocuments).toHaveBeenCalled();
            expect(mockUpdateOne).toHaveBeenCalled();
        });

        it("should return early if collection was deleted", async () => {
            const mockDb = {
                listCollections: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([]), // collection gone
                }),
            } as any;

            await updateSearchSignalWhenJobsFinish({
                searchJobId: 1,
                aggregationJobId: 2,
                queryJobDbManager: {awaitJobCompletion: vi.fn().mockResolvedValue(2)} as any,
                mongoDb: mockDb,
                metadataCollectionName: "metadata",
            });

            // No collection methods called since collection doesn't exist
        });
    });

    describe("createMongoIndexes", () => {
        it("should create ascending and descending timestamp indexes", async () => {
            const mockCreateIndex = vi.fn().mockResolvedValue("timestamp_1");
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    createIndex: mockCreateIndex,
                }),
            } as any;

            await createMongoIndexes({searchJobId: 42, mongoDb: mockDb});

            expect(mockDb.collection).toHaveBeenCalledWith("42");
            expect(mockCreateIndex).toHaveBeenCalledTimes(2);
            expect(mockCreateIndex).toHaveBeenCalledWith({timestamp: 1});
            expect(mockCreateIndex).toHaveBeenCalledWith({timestamp: -1});
        });
    });
});
