import {
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";

import {MongoSocketCursor} from "./MongoSocketCursor";


// Create a mock socket
/**
 *
 */
const createMockSocket = () => {
    const listeners: Record<string, (...args: unknown[]) => void> = {};

    return {
        emit: vi.fn(),
        emitWithAck: vi.fn(),
        on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
            listeners[event] = callback;
        }),
        off: vi.fn((event: string) => {
            delete listeners[event];
        }),
        listeners,
    };
};

type MockSocket = ReturnType<typeof createMockSocket>;


describe("MongoSocketCursor", () => {
    let mockSocket: MockSocket;

    beforeEach(() => {
        mockSocket = createMockSocket();
    });

    test("subscribe sends subscription request and receives initial data", async () => {
        const onDataUpdate = vi.fn();
        const initialDocuments = [{_id: "1", message: "test"}];

        mockSocket.emitWithAck.mockResolvedValue({
            data: {queryId: 42, initialDocuments},
        });

        const cursor = new MongoSocketCursor(
            mockSocket as unknown as import("socket.io-client").Socket,
            "test-collection",
            {field: "value"},
            {limit: 100}
        );

        await cursor.subscribe(onDataUpdate);

        expect(mockSocket.emitWithAck).toHaveBeenCalledWith(
            "collection::find::subscribe",
            {
                collectionName: "test-collection",
                query: {field: "value"},
                options: {limit: 100},
            }
        );

        expect(onDataUpdate).toHaveBeenCalledWith(initialDocuments);
    });

    test("subscribe registers update listener", async () => {
        const onDataUpdate = vi.fn();

        mockSocket.emitWithAck.mockResolvedValue({
            data: {queryId: 1, initialDocuments: []},
        });

        const cursor = new MongoSocketCursor(
            mockSocket as unknown as import("socket.io-client").Socket,
            "test-collection",
            {},
            {}
        );

        await cursor.subscribe(onDataUpdate);

        expect(mockSocket.on).toHaveBeenCalledWith(
            "collection::find::update",
            expect.any(Function)
        );
    });

    test("subscribe throws on error response", async () => {
        const onDataUpdate = vi.fn();

        mockSocket.emitWithAck.mockResolvedValue({
            error: "Collection not found",
        });

        const cursor = new MongoSocketCursor(
            mockSocket as unknown as import("socket.io-client").Socket,
            "nonexistent",
            {},
            {}
        );

        await expect(cursor.subscribe(onDataUpdate)).rejects.toThrow(
            "Subscription failed: Collection not found"
        );

        // Should clean up listener on error
        expect(mockSocket.off).toHaveBeenCalledWith(
            "collection::find::update",
            expect.any(Function)
        );
    });

    test("unsubscribe emits unsubscribe event with queryId", async () => {
        mockSocket.emitWithAck.mockResolvedValue({
            data: {queryId: 99, initialDocuments: []},
        });

        const cursor = new MongoSocketCursor(
            mockSocket as unknown as import("socket.io-client").Socket,
            "test-collection",
            {},
            {}
        );

        await cursor.subscribe(vi.fn());
        cursor.unsubscribe();

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "collection::find::unsubscribe",
            {queryId: 99}
        );
        expect(mockSocket.off).toHaveBeenCalledWith(
            "collection::find::update",
            expect.any(Function)
        );
    });

    test("unsubscribe does nothing if no active subscription", () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        });

        const cursor = new MongoSocketCursor(
            mockSocket as unknown as import("socket.io-client").Socket,
            "test-collection",
            {},
            {}
        );

        cursor.unsubscribe();

        expect(consoleSpy).toHaveBeenCalledWith(
            "Attempted to unsubscribe, but no active subscription exists."
        );
        expect(mockSocket.emit).not.toHaveBeenCalledWith(
            "collection::find::unsubscribe",
            expect.anything()
        );

        consoleSpy.mockRestore();
    });

    test("update listener filters events by queryId", async () => {
        const onDataUpdate = vi.fn();
        const capturedListener = vi.fn();

        mockSocket.on.mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
            if ("collection::find::update" === event) {
                capturedListener.mockImplementation(callback);
            }
        });

        mockSocket.emitWithAck.mockResolvedValue({
            data: {queryId: 5, initialDocuments: []},
        });

        const cursor = new MongoSocketCursor(
            mockSocket as unknown as import("socket.io-client").Socket,
            "test-collection",
            {},
            {}
        );

        await cursor.subscribe(onDataUpdate);

        // Send update for a different queryId - should be ignored
        capturedListener({queryId: 99, data: [{_id: "other"}]});
        expect(onDataUpdate).toHaveBeenCalledTimes(1); // Only initial data call

        // Send update for the correct queryId
        const newData = [{_id: "2", message: "update"}];
        capturedListener({queryId: 5, data: newData});
        expect(onDataUpdate).toHaveBeenCalledTimes(2);
        expect(onDataUpdate).toHaveBeenLastCalledWith(newData);
    });
});
