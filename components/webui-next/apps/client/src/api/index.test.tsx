import React from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
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

import {
    useArchiveStats,
    useCancelPrestoQuery,
    useCancelSearchQuery,
    useClearPrestoResults,
    useClearSearchResults,
    useCompressionJobs,
    useDatasets,
    useDirectoryListing,
    useExtractStreamFile,
    useSqlQuery,
    useSubmitCompressionJob,
    useSubmitPrestoQuery,
    useSubmitSearchQuery,
} from "./index";


// ─── Mocks ──────────────────────────────────────────────────────────────────────

const mockPost = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("../lib/api-client", () => ({
    api: {
        api: {
            "compress": {
                $post: (...args: unknown[]) => mockPost(...args),
            },
            "compress-metadata": {
                $get: (...args: unknown[]) => mockGet(...args),
            },
            "archive-metadata": {
                sql: {
                    $post: (...args: unknown[]) => mockPost(...args),
                },
            },
            "os": {
                ls: {
                    $get: (...args: unknown[]) => mockGet(...args),
                },
            },
            "search": {
                query: {
                    $post: (...args: unknown[]) => mockPost(...args),
                },
                cancel: {
                    $post: (...args: unknown[]) => mockPost(...args),
                },
                results: {
                    $delete: (...args: unknown[]) => mockDelete(...args),
                },
            },
            "stream-files": {
                extract: {
                    $post: (...args: unknown[]) => mockPost(...args),
                },
            },
            "presto-search": {
                query: {
                    $post: (...args: unknown[]) => mockPost(...args),
                },
                cancel: {
                    $post: (...args: unknown[]) => mockPost(...args),
                },
                results: {
                    $delete: (...args: unknown[]) => mockDelete(...args),
                },
            },
        },
    },
}));


// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 *
 */
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {retry: false},
            mutations: {retry: false},
        },
    });

    const Wrapper = ({children}: {children: React.ReactNode}) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    return Wrapper;
};

/**
 *
 * @param data
 */
const okResponse = (data: unknown) => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
});

/**
 *
 * @param status
 */
const errorResponse = (status: number) => ({
    ok: false,
    status,
    json: () => Promise.resolve({}),
});


// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("API Hooks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("useSubmitCompressionJob", () => {
        test("submits compression job and returns jobId", async () => {
            mockPost.mockResolvedValue(okResponse({jobId: 42}));

            const {result} = renderHook(() => useSubmitCompressionJob(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                paths: ["/var/log/test.log"],
                dataset: "default",
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual({jobId: 42});
        });

        test("handles error response", async () => {
            mockPost.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useSubmitCompressionJob(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({paths: ["/test"]});

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("500");
        });
    });

    describe("useCompressionJobs", () => {
        test("fetches compression jobs list", async () => {
            const jobs = [{_id: 1, status: 2, status_msg: ""}];
            mockGet.mockResolvedValue(okResponse(jobs));

            const {result} = renderHook(() => useCompressionJobs(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(jobs);
        });
    });

    describe("useSqlQuery", () => {
        test("executes SQL and returns typed result", async () => {
            const rows = [{total_uncompressed_size: 1000, total_compressed_size: 100}];
            mockPost.mockResolvedValue(okResponse(rows));

            const {result} = renderHook(() => useSqlQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate("SELECT * FROM clp_archives");

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(rows);
        });
    });

    describe("useSubmitSearchQuery", () => {
        test("submits search query and returns job IDs", async () => {
            mockPost.mockResolvedValue(okResponse({
                searchJobId: 100,
                aggregationJobId: 101,
            }));

            const {result} = renderHook(() => useSubmitSearchQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                datasets: ["default"],
                ignoreCase: false,
                queryString: "error",
                timeRangeBucketSizeMillis: 60000,
                timestampBegin: null,
                timestampEnd: null,
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual({
                searchJobId: 100,
                aggregationJobId: 101,
            });
        });
    });

    describe("useCancelSearchQuery", () => {
        test("cancels a running search", async () => {
            mockPost.mockResolvedValue({ok: true, status: 204});

            const {result} = renderHook(() => useCancelSearchQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                searchJobId: 100,
                aggregationJobId: 101,
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
        });
    });

    describe("useExtractStreamFile", () => {
        test("extracts stream file and returns metadata", async () => {
            const extraction = {
                begin_msg_ix: 0,
                end_msg_ix: 100,
                is_last_chunk: true,
                path: "/streams/test.ir",
                stream_id: "abc123",
            };

            mockPost.mockResolvedValue(okResponse(extraction));

            const {result} = renderHook(() => useExtractStreamFile(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                dataset: null,
                extractJobType: 1,
                logEventIdx: 42,
                streamId: "abc123",
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(extraction);
        });

        test("handles error response", async () => {
            mockPost.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useExtractStreamFile(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                dataset: null,
                extractJobType: 1,
                logEventIdx: 0,
                streamId: "test",
            });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("500");
        });
    });

    // ----- Error paths for covered hooks -----

    describe("useCompressionJobs", () => {
        test("handles error response", async () => {
            mockGet.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useCompressionJobs(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("500");
        });
    });

    describe("useSqlQuery", () => {
        test("handles error response", async () => {
            mockPost.mockResolvedValue(errorResponse(400));

            const {result} = renderHook(() => useSqlQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate("SELECT INVALID");

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("400");
        });
    });

    describe("useSubmitSearchQuery", () => {
        test("handles error response", async () => {
            mockPost.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useSubmitSearchQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                datasets: ["default"],
                ignoreCase: false,
                queryString: "error",
                timeRangeBucketSizeMillis: 60000,
                timestampBegin: null,
                timestampEnd: null,
            });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("500");
        });
    });

    describe("useCancelSearchQuery", () => {
        test("handles error response", async () => {
            mockPost.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useCancelSearchQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                searchJobId: 100,
                aggregationJobId: 101,
            });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("500");
        });
    });

    // ----- Previously uncovered hooks -----

    describe("useArchiveStats", () => {
        test("fetches archive stats when sqlQuery is non-empty", async () => {
            const stats = [{total_uncompressed: 1000, total_compressed: 100}];
            mockPost.mockResolvedValue(okResponse(stats));

            const {result} = renderHook(
                () => useArchiveStats("SELECT * FROM clp_archives"),
                {wrapper: createWrapper()},
            );

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(stats);
        });

        test("does not fetch when sqlQuery is empty", () => {
            mockPost.mockResolvedValue(okResponse([]));

            const {result} = renderHook(
                () => useArchiveStats(""),
                {wrapper: createWrapper()},
            );

            expect(result.current.fetchStatus).toBe("idle");
            expect(mockPost).not.toHaveBeenCalled();
        });

        test("handles error response", async () => {
            mockPost.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(
                () => useArchiveStats("SELECT * FROM clp_archives"),
                {wrapper: createWrapper()},
            );

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("500");
        });
    });

    describe("useDatasets", () => {
        test("fetches datasets and maps to name strings", async () => {
            const rows = [{name: "dataset-a"},
                {name: "dataset-b"}];

            mockPost.mockResolvedValue(okResponse(rows));

            const {result} = renderHook(() => useDatasets(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(["dataset-a",
                "dataset-b"]);
        });

        test("handles error response", async () => {
            mockPost.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useDatasets(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("500");
        });
    });

    describe("useDirectoryListing", () => {
        test("fetches directory listing when path is non-empty", async () => {
            const listing = [{name: "file1.log", type: "file"}];
            mockGet.mockResolvedValue(okResponse(listing));

            const {result} = renderHook(
                () => useDirectoryListing("/var/log"),
                {wrapper: createWrapper()},
            );

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(listing);
        });

        test("does not fetch when path is empty", () => {
            mockGet.mockResolvedValue(okResponse([]));

            const {result} = renderHook(
                () => useDirectoryListing(""),
                {wrapper: createWrapper()},
            );

            expect(result.current.fetchStatus).toBe("idle");
            expect(mockGet).not.toHaveBeenCalled();
        });

        test("handles error response", async () => {
            mockGet.mockResolvedValue(errorResponse(403));

            const {result} = renderHook(
                () => useDirectoryListing("/root"),
                {wrapper: createWrapper()},
            );

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("403");
        });
    });

    describe("useClearSearchResults", () => {
        test("clears search results successfully", async () => {
            mockDelete.mockResolvedValue({ok: true, status: 200});

            const {result} = renderHook(() => useClearSearchResults(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                searchJobId: "100",
                aggregationJobId: "101",
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
        });

        test("handles error response", async () => {
            mockDelete.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useClearSearchResults(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                searchJobId: "100",
                aggregationJobId: "101",
            });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("500");
        });
    });

    describe("useSubmitPrestoQuery", () => {
        test("submits Presto query and returns result", async () => {
            const prestoResult = {queryId: "presto-123"};
            mockPost.mockResolvedValue(okResponse(prestoResult));

            const {result} = renderHook(() => useSubmitPrestoQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({queryString: "SELECT * FROM table"});

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(prestoResult);
        });

        test("handles error response", async () => {
            mockPost.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useSubmitPrestoQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({queryString: "SELECT INVALID"});

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("Presto query failed");
        });
    });

    describe("useCancelPrestoQuery", () => {
        test("cancels a running Presto query", async () => {
            mockPost.mockResolvedValue({ok: true, status: 204});

            const {result} = renderHook(() => useCancelPrestoQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({searchJobId: "presto-123"});

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
        });

        test("handles error response", async () => {
            mockPost.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useCancelPrestoQuery(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({searchJobId: "presto-123"});

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("Cancel Presto query failed");
        });
    });

    describe("useClearPrestoResults", () => {
        test("clears Presto results successfully", async () => {
            mockDelete.mockResolvedValue({ok: true, status: 200});

            const {result} = renderHook(() => useClearPrestoResults(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({searchJobId: "presto-123"});

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
        });

        test("handles error response", async () => {
            mockDelete.mockResolvedValue(errorResponse(500));

            const {result} = renderHook(() => useClearPrestoResults(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({searchJobId: "presto-123"});

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });
            expect(result.current.error?.message).toContain("Clear Presto results failed");
        });
    });
});
