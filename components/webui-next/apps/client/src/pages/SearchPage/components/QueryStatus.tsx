import {useEffect} from "react";

import {usePseudoProgress} from "../../../hooks/use-pseudo-progress";
import useSearchStore, {SEARCH_UI_STATE} from "../../../stores/search-store";
import {useQuerySpeed} from "../hooks/use-query-speed";


/**
 * Displays query status: running, done, failed, with result counts and a
 * pseudo progress bar during active queries.
 */
const QueryStatus = () => {
    const {
        searchJobId,
        searchUiState,
        numSearchResultsTable,
    } = useSearchStore();

    const {progress, start, stop} = usePseudoProgress();
    const {speedText} = useQuerySpeed();
    const isQuerying = searchUiState === SEARCH_UI_STATE.QUERY_ID_PENDING ||
        searchUiState === SEARCH_UI_STATE.QUERYING;

    // Start pseudo progress when querying begins, stop when done/failed
    useEffect(() => {
        if (isQuerying) {
            start();
        } else {
            stop();
        }
    }, [isQuerying,
        start,
        stop]);

    if (SEARCH_UI_STATE.DEFAULT === searchUiState) {
        if (0 === numSearchResultsTable) {
            return null;
        }

        return (
            <div className={"text-sm text-muted-foreground"}>
                {`${numSearchResultsTable} results`}
            </div>
        );
    }

    if (SEARCH_UI_STATE.QUERY_ID_PENDING === searchUiState) {
        return (
            <div className={"flex items-center gap-2 text-sm"}>
                <span className={"inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse"}/>
                <span className={"font-medium text-yellow-600"}>Running...</span>
                {null !== searchJobId && (
                    <span className={"text-muted-foreground"}>
                        {`job ${searchJobId}`}
                    </span>
                )}
                {null !== progress && (
                    <div className={"flex-1 max-w-[200px] h-1.5 rounded-full bg-muted overflow-hidden"}>
                        <div
                            className={"h-full rounded-full bg-yellow-500 transition-all duration-100"}
                            style={{width: `${progress}%`}}/>
                    </div>
                )}
            </div>
        );
    }

    if (SEARCH_UI_STATE.QUERYING === searchUiState) {
        return (
            <div className={"flex items-center gap-2 text-sm"}>
                <span className={"inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse"}/>
                <span className={"font-medium text-yellow-600"}>Running...</span>
                {null !== searchJobId && (
                    <span className={"text-muted-foreground"}>
                        {`job ${searchJobId} — ${numSearchResultsTable} results so far`}
                    </span>
                )}
                {null !== progress && (
                    <div className={"flex-1 max-w-[200px] h-1.5 rounded-full bg-muted overflow-hidden"}>
                        <div
                            className={"h-full rounded-full bg-yellow-500 transition-all duration-100"}
                            style={{width: `${progress}%`}}/>
                    </div>
                )}
            </div>
        );
    }

    if (SEARCH_UI_STATE.DONE === searchUiState) {
        return (
            <div className={"flex items-center gap-2 text-sm"}>
                <span className={"inline-block h-2 w-2 rounded-full bg-green-500"}/>
                <span className={"font-medium text-green-600"}>Done</span>
                {null !== searchJobId && (
                    <span className={"text-muted-foreground"}>
                        {`job ${searchJobId} — ${numSearchResultsTable} results${speedText}`}
                    </span>
                )}
            </div>
        );
    }

    // Remaining state is FAILED
    return (
        <div className={"flex items-center gap-2 text-sm"}>
            <span className={"inline-block h-2 w-2 rounded-full bg-red-500"}/>
            <span className={"font-medium text-red-600"}>Failed</span>
            {null !== searchJobId && (
                <span className={"text-muted-foreground"}>
                    {`job ${searchJobId}`}
                </span>
            )}
        </div>
    );
};


export {QueryStatus};
