import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type {DashboardPanel} from "@webui/common/dashboard/types";
import type {
    DataFrame,
    DataQueryResponse,
} from "@webui/datasource/types";

import {useDashboardLayoutStore} from "../stores/layout-store";
import {useDashboardTimeStore} from "../stores/time-store";
import {useDashboardVariableStore} from "../stores/variable-store";
import {useDashboardQueryPool} from "./use-dashboard-query-pool";
import {
    executePanelQuery,
} from "./panel-query-utils";
import {parseTimeRange} from "./parse-time-range";
import {
    interpolateVariables,
    resolveVariables,
} from "./variable-interpolation";


const SLOW_QUERY_THRESHOLD_MS = 15_000;

interface UsePanelQueriesResult {
    data: DataFrame[];
    error: string | null;
    isSlowQuery: boolean;
    isLoading: boolean;
    refetch: () => void;
    retryCount: number;
    rowsTruncated: boolean;
    state: "loading" | "error" | "empty" | "data";
}

interface UsePanelQueriesOptions {
    enabled?: boolean;
    panelWidthPx?: number;
}

/**
 *
 * @param query
 * @param query.data
 * @param refetch
 * @param query.error
 * @param isSlowQuery
 * @param query.isLoading
 * @param retryCount
 * @param query.isFetching
 */
function computeResult (
    query: {data: DataQueryResponse | undefined; error: Error | null; isLoading: boolean; isFetching: boolean},
    refetch: () => void,
    isSlowQuery: boolean,
    retryCount: number,
): UsePanelQueriesResult {
    const data = query.data?.data ?? [];
    const error = query.error instanceof Error ?
        query.error.message :
        query.data?.errors?.[0]?.message ?? null;
    const isLoading = query.isLoading || query.isFetching;
    const isEmpty = !query.isFetching && !error && 0 === data.length;
    const rowsTruncated = data.some((frame) => true === frame.rowsTruncated);

    let state: UsePanelQueriesResult["state"] = "data";
    if (query.isFetching) {
        state = "loading";
    } else if (error) {
        state = "error";
    } else if (isEmpty) {
        state = "empty";
    }

    return {
        data: data,
        error: error,
        isLoading: isLoading,
        isSlowQuery: isSlowQuery,
        refetch: refetch,
        retryCount: retryCount,
        rowsTruncated: rowsTruncated,
        state: state,
    };
}

/**
 *
 * @param panel
 * @param timeRange
 * @param timeRange.from
 * @param resolvedVars
 * @param timeRange.to
 */
function useQueryKey (
    panel: DashboardPanel,
    timeRange: {from: string; to: string},
    resolvedVars: Record<string, unknown>,
) {
    const effectiveFromKey = panel.timeFrom ?? timeRange.from;

    return useMemo(
        () => ["panelQuery",
            panel.id,
            panel.queries,
            effectiveFromKey,
            timeRange.to,
            JSON.stringify(resolvedVars)],
        [panel.id,
            panel.queries,
            effectiveFromKey,
            timeRange.to,
            resolvedVars],
    );
}

interface UseQueryFnOpts {
    abortRef: React.RefObject<AbortController | null>;
    panel: DashboardPanel;
    replaceVariables: (str: string) => string;
    resolvedVars: Record<string, unknown>;
    setIsSlowQuery: React.Dispatch<React.SetStateAction<boolean>>;
    slowTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
    timeRange: {from: string; to: string};
}

/**
 *
 * @param opts
 * @param opts.panel
 * @param opts.replaceVariables
 * @param opts.resolvedVars
 * @param opts.timeRange
 * @param opts.timeRange.from
 * @param opts.abortRef
 * @param opts.timeRange.to
 * @param opts.slowTimerRef
 * @param opts.setIsSlowQuery
 */
function useQueryFn (opts: UseQueryFnOpts) {
    const from = parseTimeRange(opts.timeRange.from);
    const to = parseTimeRange(opts.timeRange.to);
    const effectiveFrom = opts.panel.timeFrom ?
        parseTimeRange(opts.panel.timeFrom) :
        from;

    // Refs and setState are stable across renders — capture once outside the callback
    const abortRef = opts.abortRef;
    const slowTimerRef = opts.slowTimerRef;
    const setIsSlowQuery = opts.setIsSlowQuery;

    return useCallback(async (): Promise<DataQueryResponse> => {
        setIsSlowQuery(false);
        if (slowTimerRef.current) {
            clearTimeout(slowTimerRef.current);
        }

        slowTimerRef.current = setTimeout(() => {
            setIsSlowQuery(true);
        }, SLOW_QUERY_THRESHOLD_MS);

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const result = await executePanelQuery({
            from: effectiveFrom,
            panel: opts.panel,
            replaceVariables: opts.replaceVariables,
            resolvedVars: opts.resolvedVars,
            signal: controller.signal,
            to: to,
        });

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (slowTimerRef.current) {
            clearTimeout(slowTimerRef.current);
        }
        setIsSlowQuery(false);

        return result;
    }, [opts.panel,
        opts.replaceVariables,
        opts.resolvedVars,
        effectiveFrom,
        to,
        abortRef,
        slowTimerRef,
        setIsSlowQuery]);
}

/**
 *
 * @param panel
 * @param opts
 */
export function usePanelQueries (panel: DashboardPanel, opts?: UsePanelQueriesOptions): UsePanelQueriesResult {
    const timeRange = useDashboardTimeStore((s) => s.timeRange);
    const variableValues = useDashboardVariableStore((s) => s.variableValues);
    const dashboardUid = useDashboardLayoutStore((s) => s.dashboard?.uid ?? "");
    const abortRef = useRef<AbortController | null>(null);
    const queryClient = useQueryClient();
    const [isSlowQuery, setIsSlowQuery] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const {enqueue} = useDashboardQueryPool();

    const resolvedVarsInput = resolveVariables(variableValues, timeRange, dashboardUid, opts?.panelWidthPx);
    const resolvedVarsSerial = JSON.stringify(resolvedVarsInput);
    const resolvedVars = useMemo(() => resolvedVarsInput, [resolvedVarsSerial]);
    const replaceVariables = useCallback(
        (str: string) => interpolateVariables(str, resolvedVars),
        [resolvedVarsSerial],
    );

    const queryKey = useQueryKey(panel, timeRange, resolvedVars);
    const queryFn = useQueryFn({
        abortRef: abortRef,
        panel: panel,
        replaceVariables: replaceVariables,
        resolvedVars: resolvedVars,
        setIsSlowQuery: setIsSlowQuery,
        slowTimerRef: slowTimerRef,
        timeRange: timeRange,
    });

    // Cleanup slow query timer and abort in-flight request on unmount
    useEffect(() => {
        return () => {
            if (slowTimerRef.current) {
                clearTimeout(slowTimerRef.current);
            }
            abortRef.current?.abort();
        };
    }, []);

    const query = useQuery({
        enabled: (false !== opts?.enabled) && 0 < panel.queries.length && panel.queries.some((q) => {
            if ("string" === typeof q.query) {
                return "" !== q.query;
            }
            // CLP queries: q.query is {queryString, datasets, ...}
            if ("object" === typeof q.query && null !== q.query && "queryString" in q.query) {
                return "" !== (q.query as {queryString: string}).queryString;
            }
            return true;
        }),
        queryFn: () => enqueue(queryFn),
        queryKey: queryKey,
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30_000,
    });

    const refetch = useCallback(() => {
        setRetryCount((c) => c + 1);
        queryClient.invalidateQueries({queryKey: queryKey}).catch(() => {
        });
    }, [queryClient,
        queryKey]);

    return computeResult(query, refetch, isSlowQuery, retryCount);
}
