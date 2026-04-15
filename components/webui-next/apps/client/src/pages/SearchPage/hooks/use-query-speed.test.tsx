import React from "react";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import useSearchStore, {SEARCH_STATE_DEFAULT, SEARCH_UI_STATE} from "../../../stores/search-store";
import {useQuerySpeed} from "./use-query-speed";


// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock settings
vi.mock("../../../settings", () => ({
    settings: {
        SqlDbClpArchivesTableName: "",
        SqlDbClpTablePrefix: "clp_",
    },
}));


/**
 *
 * @param root0
 * @param root0.children
 */
const wrapper = ({children}: {children: React.ReactNode}) => (
    <QueryClientProvider client={new QueryClient()}>
        {children}
    </QueryClientProvider>
);


describe("useQuerySpeed", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        act(() => {
            useSearchStore.setState({...SEARCH_STATE_DEFAULT});
        });
    });

    it("returns empty string when not in DONE state", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });
        const {result} = renderHook(() => useQuerySpeed(), {wrapper});
        expect(result.current.speedText).toBe("");
    });

    it("returns empty string when fetch returns no data", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => [],
        });
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "1",
                queriedDatasets: ["default"],
            });
        });
        const {result} = renderHook(() => useQuerySpeed(), {wrapper});
        expect(result.current.speedText).toBe("");
    });

    it("returns formatted speed text when data is available", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => [{bytes: 1000000, duration: 2.5}],
        });
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "1",
                queriedDatasets: ["default"],
            });
        });

        const {result} = renderHook(() => useQuerySpeed(), {wrapper});

        // Wait for the query to resolve
        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        expect(result.current.speedText).toContain("2.500 seconds");
        expect(result.current.speedText).toContain("/s");
    });

    it("returns empty string when searchJobId is null", async () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: null,
                queriedDatasets: [],
            });
        });
        const {result} = renderHook(() => useQuerySpeed(), {wrapper});
        expect(result.current.speedText).toBe("");
    });

    it("returns empty string when fetch response is not ok", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
        });
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "1",
                queriedDatasets: ["default"],
            });
        });

        const {result} = renderHook(() => useQuerySpeed(), {wrapper});

        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        expect(result.current.speedText).toBe("");
    });

    it("returns empty string when data has null bytes", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => [{bytes: null, duration: 2.5}],
        });
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "1",
                queriedDatasets: ["default"],
            });
        });

        const {result} = renderHook(() => useQuerySpeed(), {wrapper});

        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        expect(result.current.speedText).toBe("");
    });

    it("builds SQL with empty dataset names (single table query)", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => [],
        });
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "5",
                queriedDatasets: [],
            });
        });

        renderHook(() => useQuerySpeed(), {wrapper});

        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        const lastCall = mockFetch.mock.calls.at(-1);
        const callArgs = lastCall![1] as {body: string};
        const body = JSON.parse(callArgs.body) as {queryString: string};
        // Empty datasets should use the archives table name directly
        expect(body.queryString).toContain("SELECT id, uncompressed_size FROM");
    });

    it("builds SQL with multiple datasets (UNION ALL)", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => [],
        });
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "6",
                queriedDatasets: ["dataset1", "dataset2"],
            });
        });

        renderHook(() => useQuerySpeed(), {wrapper});

        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        const lastCall = mockFetch.mock.calls.at(-1);
        const callArgs = lastCall![1] as {body: string};
        const body = JSON.parse(callArgs.body) as {queryString: string};
        expect(body.queryString).toContain("UNION ALL");
        expect(body.queryString).toContain("dataset1");
        expect(body.queryString).toContain("dataset2");
    });

    it("returns empty string when duration is 0", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => [{bytes: 1000, duration: 0}],
        });
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "1",
                queriedDatasets: ["default"],
            });
        });

        const {result} = renderHook(() => useQuerySpeed(), {wrapper});

        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        expect(result.current.speedText).toBe("");
    });
});
