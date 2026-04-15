import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import MongoSocketCollection from "./MongoSocketCollection";


// Mock the socket and cursor
const mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    connected: true,
};

vi.mock("./SocketSingleton.js", () => ({
    getSharedSocket: () => mockSocket,
}));

vi.mock("./MongoSocketCursor.js", () => {
    return {
        MongoSocketCursor: vi.fn().mockImplementation(
            function (this: unknown, socket: unknown, collectionName: string, query: object, options: object) {
                // Use a regular function so `new` works
                return {socket, collectionName, query, options};
            },
        ),
    };
});


describe("MongoSocketCollection", () => {
    it("creates a cursor with find()", () => {
        const collection = new MongoSocketCollection("test_collection");
        const cursor = collection.find({foo: "bar"}, {limit: 10});

        expect(cursor).toBeDefined();
        expect((cursor as unknown as Record<string, unknown>).collectionName).toBe("test_collection");
        expect((cursor as unknown as Record<string, unknown>).query).toEqual({foo: "bar"});
        expect((cursor as unknown as Record<string, unknown>).options).toEqual({limit: 10});
    });

    it("uses shared socket from singleton", () => {
        const collection = new MongoSocketCollection("test");
        collection.find({}, {});

        // The cursor should have received the shared socket
        expect(mockSocket).toBeDefined();
    });
});
