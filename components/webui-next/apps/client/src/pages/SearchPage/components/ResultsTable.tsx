import {
    useEffect,
    useRef,
} from "react";
import {Link} from "react-router";
import SyntaxHighlighter from "react-syntax-highlighter";
import {tomorrow} from "react-syntax-highlighter/dist/esm/styles/hljs";

import {CLP_STORAGE_ENGINES} from "@clp/webui-shared";
import {useVirtualizer} from "@tanstack/react-virtual";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import MongoSocketCollection from "../../../api/socket/MongoSocketCollection";
import {DashboardCard} from "../../../components/dashboard/DashboardCard";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import {
    SETTINGS_STORAGE_ENGINE,
    STREAM_TYPE,
} from "../../../config";
import {useCursor} from "../../../hooks/use-cursor";
import useSearchStore, {SEARCH_UI_STATE} from "../../../stores/search-store";


dayjs.extend(utc);

/**
 * Timestamp display format matching the original webui.
 */
const DATETIME_FORMAT_TEMPLATE = "YYYY-MMM-DD HH:mm:ss";

/**
 * Initial estimated row height before dynamic measurement.
 */
const INITIAL_ROW_HEIGHT_ESTIMATE = 60;

interface SearchResult {
    _id: string;
    archive_id?: string;
    dataset?: string;
    filePath?: string;
    log_event_ix?: number;
    message: string;
    orig_file_id?: string;
    orig_file_path?: string;
    stream_id?: string;
    timestamp: number;
}


/**
 * Renders the status content for the results table (loading, empty, or results view).
 *
 * @param params
 * @param params.isQuerying
 * @param params.results
 * @param params.parentRef
 * @param params.virtualizer
 */
const renderResultsContent = ({
    isQuerying,
    parentRef,
    results,
    virtualizer,
}: {
    isQuerying: boolean;
    parentRef: React.RefObject<HTMLDivElement | null>;
    results: SearchResult[] | null;
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
            <div className={"mb-2 text-sm text-muted-foreground shrink-0"}>
                {results.length}
                {" "}
                results
            </div>
            <div
                className={"flex-1 min-h-0 overflow-auto"}
                ref={parentRef}
            >
                <table
                    className={"w-full text-sm"}
                    style={{tableLayout: "fixed"}}
                >
                    <colgroup>
                        <col style={{width: "200px"}}/>
                        <col/>
                    </colgroup>
                    <TableHeader className={"sticky top-0 bg-background z-10"}>
                        <TableRow>
                            <TableHead className={"px-3 py-2"}>Timestamp</TableHead>
                            <TableHead className={"px-3 py-2"}>Message</TableHead>
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
                            if (!result) {
                                return null;
                            }

                            return (
                                <TableRow
                                    data-index={virtualRow.index}
                                    key={result._id}
                                    ref={virtualizer.measureElement}
                                    style={{
                                        left: 0,
                                        position: "absolute",
                                        top: `${virtualRow.start}px`,
                                        width: "100%",
                                    }}
                                >
                                    <TableCell
                                        className={
                                            "whitespace-nowrap px-3 py-1 " +
                                            "text-xs font-mono align-top"
                                        }
                                    >
                                        {formatTimestamp(result.timestamp)}
                                    </TableCell>
                                    <TableCell
                                        className={
                                            "whitespace-normal px-3 py-1 " +
                                            "overflow-hidden break-words"
                                        }
                                    >
                                        <div className={"flex flex-col gap-0.5"}>
                                            <SyntaxHighlighter
                                                style={tomorrow}
                                                wrapLongLines={true}
                                                customStyle={{
                                                    background: "transparent",
                                                    fontSize: "0.75rem",
                                                    margin: 0,
                                                    overflowWrap: "break-word",
                                                    padding: 0,
                                                    whiteSpace: "pre-wrap",
                                                    wordBreak: "break-word",
                                                }}
                                                language={
                                                    CLP_STORAGE_ENGINES.CLP_S ===
                                                    SETTINGS_STORAGE_ENGINE ?
                                                        "json" :
                                                        "armasm"
                                                }
                                            >
                                                {result.message}
                                            </SyntaxHighlighter>
                                            {(() => {
                                                const streamId = getStreamId(result);
                                                if (!streamId || undefined === result.log_event_ix) {
                                                    return null;
                                                }

                                                const fileText =
                                                    CLP_STORAGE_ENGINES.CLP === SETTINGS_STORAGE_ENGINE ?
                                                        (result.orig_file_path ?? "Original file") :
                                                        " Original file";

                                                const datasetParam = result.dataset ?
                                                    `&dataset=${result.dataset}` :
                                                    "";

                                                return (
                                                    <Link
                                                        target={"_blank"}
                                                        title={"Open file"}
                                                        to={`/streamFile?type=${STREAM_TYPE}&streamId=${streamId}&logEventIdx=${result.log_event_ix}${datasetParam}`}
                                                        className={
                                                            "mt-0.5 text-xs text-primary " +
                                                            "hover:underline inline-flex " +
                                                            "items-center gap-1"
                                                        }
                                                    >
                                                        {fileText}
                                                    </Link>
                                                );
                                            })()}
                                        </div>
                                    </TableCell>
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
 * Returns the stream ID based on the storage engine, matching the original webui logic.
 *
 * @param result
 */
const getStreamId = (result: SearchResult): string => {
    return CLP_STORAGE_ENGINES.CLP === SETTINGS_STORAGE_ENGINE ?
        (result.orig_file_id ?? "") :
        (result.archive_id ?? "");
};


/**
 *
 * @param ts
 */
const formatTimestamp = (ts: number): string => {
    return dayjs.utc(ts).format(DATETIME_FORMAT_TEMPLATE);
};


/**
 * Displays search results in a virtualized table using @tanstack/react-virtual.
 */
const ResultsTable = () => {
    const {
        searchJobId,
        searchUiState,
        updateNumSearchResultsTable,
    } = useSearchStore();

    const parentRef = useRef<HTMLDivElement>(null);
    const isQuerying = searchUiState === SEARCH_UI_STATE.QUERY_ID_PENDING ||
        searchUiState === SEARCH_UI_STATE.QUERYING;

    const results = useCursor<SearchResult>(() => {
        if (null === searchJobId) {
            return null;
        }

        const collection = new MongoSocketCollection(searchJobId);

        return collection.find({}, {sort: {timestamp: -1, _id: -1}, limit: 1000});
    }, [searchJobId]);

    // Update the store with the count
    useEffect(() => {
        if (results && results.length !== useSearchStore.getState().numSearchResultsTable) {
            updateNumSearchResultsTable(results.length);
        }
    }, [results,
        updateNumSearchResultsTable]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const virtualizer = useVirtualizer({
        count: results?.length ?? 0,
        estimateSize: () => INITIAL_ROW_HEIGHT_ESTIMATE,
        getScrollElement: () => parentRef.current,
        measureElement: (el) => el.getBoundingClientRect().height,
        overscan: 10,
    });

    return (
        <DashboardCard
            className={"flex flex-col h-full"}
            title={"Search Results"}
        >
            {renderResultsContent({
                isQuerying,
                parentRef,
                results,
                virtualizer,
            })}
        </DashboardCard>
    );
};


export {ResultsTable};
