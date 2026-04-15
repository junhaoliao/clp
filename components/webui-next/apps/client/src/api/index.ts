/**
 * React Query hooks wrapping the Hono RPC client for all API endpoints.
 *
 * Each hook provides typed request/response via the server's AppType.
 */
import {QUERY_JOB_TYPE} from "@clp/webui-shared";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {api} from "../lib/api-client";


// ─── Query Keys ────────────────────────────────────────────────────────────────

const QUERY_KEYS = {
    compressionJobs: ["compression-jobs"] as const,
    directoryListing: (path: string) => ["directory-listing",
        path] as const,
};

export {QUERY_KEYS};


// ─── Compress ──────────────────────────────────────────────────────────────────

/**
 * Submit a compression job.
 */
const useSubmitCompressionJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: {
            paths: string[];
            dataset?: string;
            timestampKey?: string;
            unstructured?: boolean;
        }) => {
            const res = await api.api.compress.$post({json: payload});
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`Failed to submit compression job: ${res.status}`);
            }

            return await res.json();
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: QUERY_KEYS.compressionJobs});
        },
    });
};


// ─── Compress Metadata ─────────────────────────────────────────────────────────

/**
 * Fetch the list of recent compression jobs with decoded configs.
 */
const useCompressionJobs = () => {
    return useQuery({
        queryKey: QUERY_KEYS.compressionJobs,
        queryFn: async () => {
            const res = await api.api["compress-metadata"].$get();
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`Failed to fetch compression jobs: ${res.status}`);
            }

            return await res.json();
        },
    });
};


// ─── Archive Metadata (SQL) ────────────────────────────────────────────────────

/**
 * Execute a raw SQL query against the archive metadata database.
 */
const useSqlQuery = () => {
    return useMutation({
        mutationFn: async (queryString: string) => {
            const res = await api.api["archive-metadata"].sql.$post({
                json: {queryString},
            });

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`SQL query failed: ${res.status}`);
            }

            return await res.json();
        },
    });
};


// ─── Archive Stats ──────────────────────────────────────────────────────────────

/**
 * Fetch aggregate archive statistics (uncompressed + compressed sizes).
 * Auto-fetches on mount via useQuery.
 *
 * @param sqlQuery
 */
const useArchiveStats = (sqlQuery: string) => {
    return useQuery({
        queryKey: ["archive-stats",
            sqlQuery],
        queryFn: async () => {
            const res = await api.api["archive-metadata"].sql.$post({
                json: {queryString: sqlQuery},
            });

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`Archive stats query failed: ${res.status}`);
            }

            return await res.json();
        },
        enabled: 0 < sqlQuery.length,
    });
};


/**
 * Fetch dataset names from the datasets table.
 */
const useDatasets = () => {
    return useQuery({
        queryKey: ["datasets"],
        queryFn: async () => {
            const res = await api.api["archive-metadata"].sql.$post({
                json: {queryString: "SELECT name FROM clp_datasets;"},
            });

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`Datasets query failed: ${res.status}`);
            }

            const rows = await res.json() as Array<{name: string}>;
            return rows.map((r) => r.name);
        },
    });
};


// ─── OS (Directory Listing) ────────────────────────────────────────────────────

/**
 * List files/directories at a given path.
 *
 * @param path
 */
const useDirectoryListing = (path: string) => {
    return useQuery({
        queryKey: QUERY_KEYS.directoryListing(path),
        queryFn: async () => {
            const res = await api.api.os.ls.$get({query: {path}});
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`Directory listing failed: ${res.status}`);
            }

            return await res.json();
        },
        enabled: 0 < path.length,
    });
};


// ─── Search ─────────────────────────────────────────────────────────────────────

/**
 * Submit a search query.
 */
const useSubmitSearchQuery = () => {
    return useMutation({
        mutationFn: async (payload: {
            datasets: string[];
            ignoreCase: boolean;
            queryString: string;
            timeRangeBucketSizeMillis: number;
            timestampBegin: number | null;
            timestampEnd: number | null;
        }) => {
            const res = await api.api.search.query.$post({json: payload});
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`Search query failed: ${res.status}`);
            }

            return await res.json();
        },
    });
};

/**
 * Cancel a running search query.
 */
const useCancelSearchQuery = () => {
    return useMutation({
        mutationFn: async (payload: {
            searchJobId: number;
            aggregationJobId: number;
        }) => {
            const res = await api.api.search.cancel.$post({json: payload});
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`Cancel search failed: ${res.status}`);
            }
        },
    });
};

/**
 * Clear search results.
 */
const useClearSearchResults = () => {
    return useMutation({
        mutationFn: async (payload: {
            searchJobId: string;
            aggregationJobId: string;
        }) => {
            const res = await api.api.search.results.$delete({json: payload});
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`Clear search results failed: ${res.status}`);
            }
        },
    });
};


// ─── Presto Search ──────────────────────────────────────────────────────────────
// NOTE: Presto search routes are conditionally loaded on the server, so we use
// `as any` to bypass the TypeScript type checker for these routes.

/**
 * Submit a Presto SQL query.
 */
const useSubmitPrestoQuery = () => {
    return useMutation({
        mutationFn: async (payload: {queryString: string}) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const res = await (api.api as any)["presto-search"].query.$post({json: payload});
            /* eslint-disable @typescript-eslint/no-unsafe-member-access */
            if (!res.ok) {
                throw new Error(`Presto query failed: ${String(res.status)}`);
            }
            /* eslint-enable @typescript-eslint/no-unsafe-member-access */

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            return await res.json();
        },
    });
};

/**
 * Cancel a running Presto query.
 */
const useCancelPrestoQuery = () => {
    return useMutation({
        mutationFn: async (payload: {searchJobId: string}) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const res = await (api.api as any)["presto-search"].cancel.$post({json: payload});
            /* eslint-disable @typescript-eslint/no-unsafe-member-access */
            if (!res.ok) {
                throw new Error(`Cancel Presto query failed: ${String(res.status)}`);
            }
            /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        },
    });
};

/**
 * Clear Presto query results.
 */
const useClearPrestoResults = () => {
    return useMutation({
        mutationFn: async (payload: {searchJobId: string}) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const res = await (api.api as any)["presto-search"].results.$delete({json: payload});
            /* eslint-disable @typescript-eslint/no-unsafe-member-access */
            if (!res.ok) {
                throw new Error(`Clear Presto results failed: ${String(res.status)}`);
            }
            /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        },
    });
};


// ─── Stream Files ───────────────────────────────────────────────────────────────

/**
 * Extract a stream file for log viewer display.
 */
const useExtractStreamFile = () => {
    return useMutation({
        mutationFn: async (payload: {
            dataset: string | null;
            extractJobType: QUERY_JOB_TYPE;
            logEventIdx: number;
            streamId: string;
        }) => {
            const res = await api.api["stream-files"].extract.$post({json: payload});
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!res.ok) {
                throw new Error(`Stream file extraction failed: ${res.status}`);
            }

            return await res.json();
        },
    });
};


// ─── Exports ────────────────────────────────────────────────────────────────────

export {
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
};
