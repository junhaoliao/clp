import type {Db} from "mongodb";
import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    insertPrestoRowsToMongo,
    prestoRowToObject,
} from "./utils.js";


describe("prestoRowToObject", () => {
    it("should convert row arrays to objects using column names", () => {
        const row = [1,
            "hello",
            true];
        const columns = ["id",
            "message",
            "active"];
        const result = prestoRowToObject(row, columns);
        expect(result).toEqual({
            row: {id: 1, message: "hello", active: true},
        });
    });

    it("should handle empty row", () => {
        const result = prestoRowToObject([], []);
        expect(result).toEqual({row: {}});
    });
});

describe("insertPrestoRowsToMongo", () => {
    it("should not insert if data is empty", async () => {
        const mockCollection = {
            insertMany: vi.fn(),
        };
        const mockDb = {
            collection: vi.fn().mockReturnValue(mockCollection),
        } as any as Db;

        await insertPrestoRowsToMongo([], ["col1"], "job-1", mockDb);

        expect(mockDb.collection).not.toHaveBeenCalled();
    });

    it("should insert rows as documents", async () => {
        const mockInsertMany = vi.fn().mockResolvedValue({insertedCount: 2});
        const mockCollection = {
            insertMany: mockInsertMany,
        };
        const mockDb = {
            collection: vi.fn().mockReturnValue(mockCollection),
        } as any as Db;

        await insertPrestoRowsToMongo(
            [[1,
                "a"],
            [2,
                "b"]],
            ["id",
                "name"],
            "job-1",
            mockDb,
        );

        expect(mockDb.collection).toHaveBeenCalledWith("job-1");
        expect(mockInsertMany).toHaveBeenCalledOnce();
        const docs = mockInsertMany.mock.calls[0][0];
        expect(docs).toHaveLength(2);
        expect(docs[0]).toMatchObject({_id: 0, row: {id: 1, name: "a"}});
        expect(docs[1]).toMatchObject({_id: 1, row: {id: 2, name: "b"}});
    });
});
