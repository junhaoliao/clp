import {
    renderHook,
    waitFor,
} from "@testing-library/react";
import {
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";


// Use vi.hoisted for mock functions referenced in vi.mock factories
const {mockSubscribe, mockUnsubscribe, MockCursor} = vi.hoisted(() => {
    const mockSubscribe = vi.fn();
    const mockUnsubscribe = vi.fn();
    class MockCursor {
        subscribe = mockSubscribe;

        unsubscribe = mockUnsubscribe;
    }

    return {mockSubscribe, mockUnsubscribe, MockCursor};
});

vi.mock("../api/socket/MongoSocketCursor", () => ({
    MongoSocketCursor: MockCursor,
}));

import {useCursor} from "./use-cursor";


describe("useCursor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("returns null when query function returns null", () => {
        const {result} = renderHook(() => useCursor(() => null));

        expect(result.current).toBeNull();
    });

    test("returns null initially while subscription is pending", () => {
        mockSubscribe.mockReturnValue(new Promise(() => {
        })); // never resolves

        const {result} = renderHook(() => useCursor(() => new MockCursor() as any));

        expect(result.current).toBeNull();
    });

    test("returns initial data after subscription resolves", async () => {
        const initialData = [{_id: "1", value: "test"}];
        mockSubscribe.mockImplementation(async (onDataUpdate: (data: object[]) => void) => {
            onDataUpdate(initialData);
        });

        const {result} = renderHook(() => useCursor(() => new MockCursor() as any));

        await waitFor(() => {
            expect(result.current).toEqual(initialData);
        });
    });

    test("unsubscribes on unmount", async () => {
        mockSubscribe.mockImplementation(async (onDataUpdate: (data: object[]) => void) => {
            onDataUpdate([]);
        });

        const {unmount} = renderHook(() => useCursor(() => new MockCursor() as any));

        await waitFor(() => {
            expect(mockSubscribe).toHaveBeenCalled();
        });

        unmount();

        await waitFor(() => {
            expect(mockUnsubscribe).toHaveBeenCalled();
        });
    });

    test("handles subscription error gracefully", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        });

        mockSubscribe.mockRejectedValue(new Error("Connection refused"));

        const {result} = renderHook(() => useCursor(() => new MockCursor() as any));

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        expect(result.current).toBeNull();
        consoleErrorSpy.mockRestore();
    });

    test("handles unsubscription error gracefully", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        });

        // Subscription resolves successfully, but unsubscribe throws during cleanup
        mockSubscribe.mockResolvedValue(undefined);
        mockUnsubscribe.mockImplementation(() => {
            throw new Error("Unsubscribe failed");
        });

        const {unmount} = renderHook(() => useCursor(() => new MockCursor() as any));

        await waitFor(() => {
            expect(mockSubscribe).toHaveBeenCalled();
        });

        unmount();

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Error during unsubscription:",
                expect.any(Error),
            );
        });

        consoleErrorSpy.mockRestore();
    });

    test("ignores data updates after unmount", async () => {
        let capturedOnDataUpdate: ((data: object[]) => void) | null = null;
        mockSubscribe.mockImplementation(async (onDataUpdate: (data: object[]) => void) => {
            capturedOnDataUpdate = onDataUpdate;

            // Send initial data
            onDataUpdate([{_id: "1", value: "initial"}]);
        });

        const {result, unmount} = renderHook(() => useCursor(() => new MockCursor() as any));

        await waitFor(() => {
            expect(result.current).toEqual([{_id: "1", value: "initial"}]);
        });

        unmount();

        // After unmount, simulate data arriving (ignore flag should prevent state update)
        expect(capturedOnDataUpdate).not.toBeNull();

        // This call should be ignored because ignore=true after unmount
        // It should not throw or cause any issues
        expect(() => {
            capturedOnDataUpdate!([{_id: "2", value: "after-unmount"}]);
        }).not.toThrow();
    });
});
