import {Skeleton} from "@/components/ui/skeleton";
import {AlertCircle, RefreshCw, Clock, AlertTriangle} from "lucide-react";
import type {ReactNode} from "react";

export type PanelState = "loading" | "error" | "empty" | "data";

interface PanelChromeProps {
  state: PanelState;
  errorMessage?: string | undefined;
  onRetry?: (() => void) | undefined;
  isSlowQuery?: boolean | undefined;
  rowsTruncated?: boolean | undefined;
  children: ReactNode;
}

export function PanelChrome({state, errorMessage, onRetry, isSlowQuery, rowsTruncated, children}: PanelChromeProps) {
  return (
    <div className="h-full flex flex-col relative">
      {state === "loading" && <LoadingState isSlow={isSlowQuery ?? false} />}
      {state === "error" && <ErrorState message={errorMessage ?? "Query failed"} onRetry={onRetry ?? undefined} />}
      {state === "empty" && <EmptyState />}
      {state === "data" && (
        <>
          {rowsTruncated && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 px-1 py-0.5">
              <AlertTriangle className="size-3" />
              <span>Results truncated — add LIMIT or GROUP BY to see all rows</span>
            </div>
          )}
          {children}
        </>
      )}
    </div>
  );
}

function LoadingState({isSlow}: {isSlow: boolean}) {
  return (
    <div className="flex-1 flex flex-col gap-2 p-2" aria-busy="true" aria-label="Loading panel data">
      {isSlow && (
        <div className="flex items-center gap-1 text-xs text-amber-500 mb-1">
          <Clock className="size-3 animate-pulse" />
          <span>Query is taking longer than usual...</span>
        </div>
      )}
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="flex-1 w-full" />
    </div>
  );
}

function ErrorState({message, onRetry}: {message: string; onRetry?: (() => void) | undefined}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-4">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-sm text-center">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
        >
          <RefreshCw className="size-3" /> Retry
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
      No data
    </div>
  );
}
