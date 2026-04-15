import React from "react";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {useTimestampColumns} from "./use-timestamp-columns";


// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);


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


describe("useTimestampColumns", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns empty array and does not fetch when dataset is null", async () => {
        const {result} = renderHook(
            () => useTimestampColumns(null),
            {wrapper},
        );

        await waitFor(() => {
            expect(result.current.fetchStatus).toBe("idle");
        });

        expect(result.current.data).toBeUndefined();
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns empty array and does not fetch when dataset is empty string", async () => {
        const {result} = renderHook(
            () => useTimestampColumns(""),
            {wrapper},
        );

        await waitFor(() => {
            expect(result.current.fetchStatus).toBe("idle");
        });

        expect(result.current.data).toBeUndefined();
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("fetches timestamp columns for a valid dataset", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => [{name: "timestamp"}],
        });

        const {result} = renderHook(
            () => useTimestampColumns("mydataset"),
            {wrapper},
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const expectedSql =
            "SELECT name FROM clp_mydataset_column_metadata " +
            "WHERE type = 'timestamp' ORDER BY name;";

        expect(mockFetch).toHaveBeenCalledWith("/api/archive-metadata/sql", {
            body: JSON.stringify({queryString: expectedSql}),
            headers: {"Content-Type": "application/json"},
            method: "POST",
        });
    });

    it("returns empty array when fetch returns non-ok response", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => [],
        });

        const {result} = renderHook(
            () => useTimestampColumns("mydataset"),
            {wrapper},
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual([]);
    });

    it("returns column names from successful response", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => [
                {name: "created_at"},
                {name: "updated_at"},
            ],
        });

        const {result} = renderHook(
            () => useTimestampColumns("mydataset"),
            {wrapper},
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(["created_at", "updated_at"]);
    });
});
