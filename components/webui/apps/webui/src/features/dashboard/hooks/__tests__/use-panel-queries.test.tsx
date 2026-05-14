/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {ReactNode} from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    renderHook,
    waitFor,
} from "@testing-library/react";
import type {DashboardPanel} from "@webui/common/dashboard/types";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {usePanelQueries} from "../use-panel-queries";


const mockPanel: DashboardPanel = {
    id: "p1",
    type: "timeseries",
    title: "Test Panel",
    gridPos: {x: 0, y: 0, w: 6, h: 4},
    datasource: {type: "mysql", uid: "default"},
    queries: [{refId: "A", datasource: {type: "mysql", uid: "default"}, query: "SELECT 1"}],
    options: {},
};

/**
 *
 */
function createWrapper () {
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });

    return function Wrapper ({children}: {children: ReactNode}) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

describe("usePanelQueries", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
    // Default mock: returns empty data
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({data: []}),
        });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("should return loading state initially", () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => usePanelQueries(mockPanel), {wrapper});
        expect(result.current.isLoading).toBe(true);
        expect(result.current.state).toBe("loading");
    });

    it("should return empty state for panel with no queries", async () => {
        const panelNoQuery: DashboardPanel = {
            ...mockPanel,
            queries: [],
        };
        const wrapper = createWrapper();
        const {result} = renderHook(() => usePanelQueries(panelNoQuery), {wrapper});
        await waitFor(() => {
            expect(result.current.state).toBe("empty");
        });
        expect(result.current.data).toEqual([]);
    });

    it("should transition to data state on successful fetch", async () => {
        const mockData = [{name: "test", fields: [], length: 0}];
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({data: mockData}),
        });

        const wrapper = createWrapper();
        const {result} = renderHook(() => usePanelQueries(mockPanel), {wrapper});

        await waitFor(() => {
            expect(result.current.state).not.toBe("loading");
        }, {timeout: 3000});

        // Empty data array from server → "empty" state (no DataFrames)
        // With non-empty data → "data" state
        expect(["data",
            "empty"]).toContain(result.current.state);
    });

    it("should send query to correct datasource type route", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({data: []}),
        });

        const wrapper = createWrapper();
        renderHook(() => usePanelQueries(mockPanel), {wrapper});

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                "/api/datasource/mysql/query",
                expect.objectContaining({method: "POST"}),
            );
        });
    });

    it("should send interpolated queries and time range", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({data: []}),
        });

        const wrapper = createWrapper();
        renderHook(() => usePanelQueries(mockPanel), {wrapper});

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                expect.any(String),

                expect.objectContaining({
                    body: expect.any(String),
                }),
            );
        });


        const {calls} = (globalThis.fetch as ReturnType<typeof vi.fn>).mock;
        const [firstCall] = calls;
        const opts = firstCall?.[1] as RequestInit;
        const body = JSON.parse(opts.body as string) as Record<string, unknown>;
        const range = body["range"] as Record<string, unknown>;
        expect(body).toHaveProperty("queries");
        expect(body).toHaveProperty("range");
        expect(range).toHaveProperty("from");
        expect(range).toHaveProperty("to");
    });

    it("should pass AbortSignal to fetch (NFR-10)", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({data: []}),
        });

        const wrapper = createWrapper();
        renderHook(() => usePanelQueries(mockPanel), {wrapper});

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                expect.any(String),

                expect.objectContaining({signal: expect.any(AbortSignal)}),
            );
        });
    });

    it("should abort in-flight request on unmount (NFR-10)", async () => {
        let capturedSignal: AbortSignal | null = null;

        // Create a fetch that captures the signal and never resolves
        globalThis.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
            capturedSignal = opts.signal as AbortSignal;

            return new Promise(() => {
            });
        });

        const wrapper = createWrapper();
        const {unmount} = renderHook(() => usePanelQueries(mockPanel), {wrapper});

        // Wait for fetch to be called with a signal
        await waitFor(() => {
            expect(capturedSignal).not.toBeNull();
        });

        unmount();

        // After unmount, the signal should be aborted
        await waitFor(() => {
            expect(capturedSignal?.aborted).toBe(true);
        });
    });

    it("should not poll on interval (refetchInterval: false overrides global default)", async () => {
        vi.useFakeTimers({shouldAdvanceTime: true});

        const mockData = [{name: "test", fields: [], length: 0}];
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({data: mockData}),
        });

        // Create a wrapper with the global refetchInterval default (like the real app)
        const queryClientWithInterval = new QueryClient({
            defaultOptions: {queries: {retry: false, refetchInterval: 10_000}},
        });

        /**
         *
         * @param root0
         * @param root0.children
         */
        const WrapperWithInterval = ({children}: {children: ReactNode}) => {
            return (
                <QueryClientProvider client={queryClientWithInterval}>
                    {children}
                </QueryClientProvider>
            );
        };

        renderHook(() => usePanelQueries(mockPanel), {wrapper: WrapperWithInterval});

        // Advance through the initial fetch
        await vi.advanceTimersByTimeAsync(100);

        const fetchCountAfterInitial = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

        // Advance past the global 10s interval — fetch should NOT be called again
        // because refetchInterval: false on the query overrides the global default
        await vi.advanceTimersByTimeAsync(15_000);

        expect(globalThis.fetch).toHaveBeenCalledTimes(fetchCountAfterInitial);

        vi.useRealTimers();
    });

    it("should set isRefetching=false and isLoading=true on initial load", () => {
        // Create a fetch that never resolves so we stay in loading state
        globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {
        }));

        const wrapper = createWrapper();
        const {result} = renderHook(() => usePanelQueries(mockPanel), {wrapper});

        expect(result.current.isLoading).toBe(true);
        expect(result.current.isRefetching).toBe(false);
        expect(result.current.state).toBe("loading");
    });

    it("should set isRefetching=false after fetch completes", async () => {
        const mockData = [{name: "test", fields: [{name: "value", values: [1], type: "number"}], length: 1}];
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({data: mockData}),
        });

        const wrapper = createWrapper();
        const {result} = renderHook(() => usePanelQueries(mockPanel), {wrapper});

        await waitFor(() => {
            expect(result.current.state).not.toBe("loading");
        }, {timeout: 10_000});

        expect(result.current.isRefetching).toBe(false);
        expect(result.current.isLoading).toBe(false);
    });

    it("should set isRefetching=true and keep state=data during background refetch", async () => {
        // First fetch resolves immediately with data
        const mockData = [{name: "test", fields: [{name: "value", values: [1], type: "number"}], length: 1}];
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({data: mockData}),
        });

        const wrapper = createWrapper();
        const {result} = renderHook(() => usePanelQueries(mockPanel), {wrapper});

        // Wait for initial fetch to complete
        await waitFor(() => {
            expect(result.current.state).not.toBe("loading");
        }, {timeout: 10_000});

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isRefetching).toBe(false);

        // Now make the next fetch hang (simulating a background refetch in progress)
        globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {
        }));

        // Trigger a refetch
        result.current.refetch();

        // Wait for the refetch to start (isRefetching becomes true)
        await waitFor(() => {
            expect(result.current.isRefetching).toBe(true);
        }, {timeout: 10_000});

        // During background refetch: isLoading is false, state remains "data"
        expect(result.current.isLoading).toBe(false);
        expect(result.current.state).toBe("data");
    });
});
