import {useRef} from "react";

import {PrestoSearchResult} from "@clp/webui-shared";
import {useVirtualizer} from "@tanstack/react-virtual";

import MongoSocketCollection from "../../../api/socket/MongoSocketCollection";
import {DashboardCard} from "../../../components/dashboard/DashboardCard";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import {useCursor} from "../../../hooks/use-cursor";
import useSearchStore, {SEARCH_UI_STATE} from "../../../stores/search-store";


/**
 * Default row height estimate for virtualized rows.
 */
const ROW_HEIGHT_ESTIMATE = 36;


/**
 * Renders the Presto results content (loading, empty, or table view).
 *
 * @param params
 * @param params.isQuerying
 * @param params.results
 * @param params.columns
 * @param params.parentRef
 * @param params.virtualizer
 */
const renderPrestoResultsContent = ({
    columns,
    isQuerying,
    parentRef,
    results,
    virtualizer,
}: {
    columns: string[];
    isQuerying: boolean;
    parentRef: React.RefObject<HTMLDivElement | null>;
    results: PrestoSearchResult[] | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    virtualizer: any;
}) => {
    if (isQuerying && null === results) {
        return (
            <div className={"py-4 text-center text-sm text-muted-foreground"}>
                Loading results...
            </div>
        );
    }

    if (null === results || 0 === results.length) {
        return (
            <div className={"py-4 text-center text-sm text-muted-foreground"}>
                No results available.
            </div>
        );
    }

    return (
        <>
            <div className={"mb-2 text-sm text-muted-foreground"}>
                {results.length}
                {" "}
                results
            </div>
            <div
                className={"max-h-[600px] overflow-auto"}
                ref={parentRef}
            >
                <table className={"w-full text-sm"}>
                    <TableHeader className={"sticky top-0 bg-background z-10"}>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead
                                    className={"px-3 py-2"}
                                    key={col}
                                >
                                    {col}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            position: "relative",
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualRow: {index: number; key: string; start: number; size: number}) => {
                            const result = results[virtualRow.index];
                            if (!result?.row) {
                                return null;
                            }

                            return (
                                <TableRow
                                    data-index={virtualRow.index}
                                    key={virtualRow.key}
                                    ref={virtualizer.measureElement}
                                    style={{
                                        left: 0,
                                        position: "absolute",
                                        top: `${virtualRow.start}px`,
                                        width: "100%",
                                    }}
                                >
                                    {columns.map((col) => (
                                        <TableCell
                                            key={col}
                                            className={
                                                "whitespace-nowrap px-3 py-1 " +
                                                "text-xs font-mono"
                                            }
                                        >
                                            {/* eslint-disable-next-line @typescript-eslint/no-base-to-string */}
                                            {String(result.row[col] ?? "")}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </table>
            </div>
        </>
    );
};


/**
 * Displays Presto search results with dynamic columns in a virtualized table.
 */
const PrestoResultsTable = () => {
    const {searchJobId, searchUiState, updateNumSearchResultsTable} = useSearchStore();
    const parentRef = useRef<HTMLDivElement>(null);
    const isQuerying = searchUiState === SEARCH_UI_STATE.QUERY_ID_PENDING ||
        searchUiState === SEARCH_UI_STATE.QUERYING;

    const results = useCursor<PrestoSearchResult>(() => {
        if (null === searchJobId) {
            return null;
        }

        const collection = new MongoSocketCollection(searchJobId);

        return collection.find({}, {sort: {_id: -1}, limit: 1000});
    }, [searchJobId]);

    // Update store count
    if (results && results.length !== useSearchStore.getState().numSearchResultsTable) {
        updateNumSearchResultsTable(results.length);
    }

    // Derive columns from the first result's row keys
    const columns = results && 0 < results.length && results[0]?.row ?
        Object.keys(results[0].row) :
        [];

    const virtualizer = useVirtualizer({
        count: results?.length ?? 0,
        estimateSize: () => ROW_HEIGHT_ESTIMATE,
        getScrollElement: () => parentRef.current,
        measureElement: (el) => el.getBoundingClientRect().height,
        overscan: 10,
    });

    return (
        <DashboardCard title={"Query Results"}>
            {renderPrestoResultsContent({
                columns,
                isQuerying,
                parentRef,
                results,
                virtualizer,
            })}
        </DashboardCard>
    );
};


export {PrestoResultsTable};
