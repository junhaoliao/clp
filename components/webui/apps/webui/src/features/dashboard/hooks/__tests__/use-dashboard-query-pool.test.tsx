import type {ReactNode} from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    renderHook,
    waitFor,
} from "@testing-library/react";
import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {useDashboardQueryPool} from "../use-dashboard-query-pool";


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

describe("useDashboardQueryPool", () => {
    it("should limit concurrent queries to 5", () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useDashboardQueryPool(), {wrapper});
        const CONCURRENCY_LIMIT = 5;

        expect(result.current.limit).toBe(CONCURRENCY_LIMIT);
    });

    it("should execute enqueued queries", async () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useDashboardQueryPool(), {wrapper});

        const resolveSpy = vi.fn();
        const promise = result.current.enqueue(() => {
            resolveSpy();

            return Promise.resolve("done");
        });

        await waitFor(() => {
            expect(resolveSpy).toHaveBeenCalled();
        });

        const value = await promise;
        expect(value).toBe("done");
    });

    it("should queue queries beyond concurrency limit", async () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useDashboardQueryPool(), {wrapper});

        const executionOrder: number[] = [];
        const promises: Promise<unknown>[] = [];

        // Create more queries than the limit
        const TOTAL_QUERIES = 7;
        for (let i = 0; TOTAL_QUERIES > i; i++) {
            const idx = i;
            promises.push(result.current.enqueue(() => {
                executionOrder.push(idx);

                return Promise.resolve(idx);
            }));
        }

        await Promise.all(promises);

        // All should eventually execute
        expect(executionOrder).toHaveLength(TOTAL_QUERIES);
    });
});
