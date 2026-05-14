import type {ReactNode} from "react";

import {
    AlertCircle,
    AlertTriangle,
    Clock,
    RefreshCw,
} from "lucide-react";

import {Skeleton} from "@/components/ui/skeleton";


export type PanelState = "loading" | "error" | "empty" | "data";

interface PanelChromeProps {
    state: PanelState;
    errorMessage?: string | undefined;
    onRetry?: (() => void) | undefined;
    isRefetching?: boolean | undefined;
    isSlowQuery?: boolean | undefined;
    rowsTruncated?: boolean | undefined;
    children: ReactNode;
}

/**
 *
 * @param root0
 * @param root0.state
 * @param root0.errorMessage
 * @param root0.onRetry
 * @param root0.isRefetching
 * @param root0.isSlowQuery
 * @param root0.rowsTruncated
 * @param root0.children
 */
export const PanelChrome = ({state, errorMessage, onRetry, isRefetching, isSlowQuery, rowsTruncated, children}: PanelChromeProps) => {
    return (
        <div className={"h-full flex flex-col relative"}>
            {isRefetching && "data" === state && <LinearProgressBar/>}
            {"loading" === state && <LoadingState isSlow={isSlowQuery ?? false}/>}
            {"error" === state && <ErrorState
                message={errorMessage ?? "Query failed"}
                onRetry={onRetry ?? undefined}/>}
            {"empty" === state && <EmptyState/>}
            {"data" === state && (
                <>
                    {rowsTruncated && (
                        <div className={"flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 px-1 py-0.5"}>
                            <AlertTriangle className={"size-3"}/>
                            <span>Results truncated — add LIMIT or GROUP BY to see all rows</span>
                        </div>
                    )}
                    {children}
                </>
            )}
        </div>
    );
};

/**
 *
 * @param root0
 * @param root0.isSlow
 */
const LoadingState = ({isSlow}: {isSlow: boolean}) => {
    return (
        <div
            aria-busy={"true"}
            aria-label={"Loading panel data"}
            className={"flex-1 flex flex-col gap-2 p-2"}
        >
            {isSlow && (
                <div className={"flex items-center gap-1 text-xs text-amber-500 mb-1"}>
                    <Clock className={"size-3 animate-pulse"}/>
                    <span>Query is taking longer than usual...</span>
                </div>
            )}
            <Skeleton className={"h-4 w-3/4"}/>
            <Skeleton className={"h-4 w-1/2"}/>
            <Skeleton className={"flex-1 w-full"}/>
        </div>
    );
};

/**
 *
 * @param root0
 * @param root0.message
 * @param root0.onRetry
 */
const ErrorState = ({message, onRetry}: {message: string; onRetry?: (() => void) | undefined}) => {
    return (
        <div className={"flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-4"}>
            <AlertCircle className={"size-8 text-destructive"}/>
            <p className={"text-sm text-center"}>
                {message}
            </p>
            {onRetry && (
                <button
                    className={"inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"}
                    type={"button"}
                    onClick={onRetry}
                >
                    <RefreshCw className={"size-3"}/>
                    {" "}
                    Retry
                </button>
            )}
        </div>
    );
};

/**
 *
 */
const EmptyState = () => {
    return (
        <div className={"flex-1 flex items-center justify-center text-muted-foreground text-xs"}>
            No data
        </div>
    );
};

/**
 *
 */
const LinearProgressBar = () => {
    return (
        <div className={"absolute top-0 left-0 right-0 h-0.5 overflow-hidden z-10"}>
            <div className={"h-full bg-primary animate-indeterminate-progress"}/>
        </div>
    );
};
