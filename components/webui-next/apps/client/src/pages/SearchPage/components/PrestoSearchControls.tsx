import React, {
    useEffect,
    useState,
} from "react";

import dayjs from "dayjs";

import {
    useCancelPrestoQuery,
    useClearPrestoResults,
    useDatasets,
    useSubmitPrestoQuery,
} from "../../../api";
import SqlEditor from "../../../components/SqlEditor";
import {Button} from "../../../components/ui/button";
import {Input} from "../../../components/ui/input";
import {Label} from "../../../components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import {
    buildSearchQuery,
    validateBooleanExpression,
    validateSelectItemList,
} from "../../../sql-parser";
import usePrestoSearchState, {PRESTO_SQL_INTERFACE} from "../../../stores/presto-search-store";
import useSearchStore, {SEARCH_UI_STATE} from "../../../stores/search-store";
import {useTimestampColumns} from "../hooks/use-timestamp-columns";


/**
 * Clears previous search results from the store and server.
 *
 * @param clearResults
 */
const clearPreviousResults = (clearResults: ReturnType<typeof useClearPrestoResults>) => {
    const {searchJobId: prevJobId} = useSearchStore.getState();
    if (null !== prevJobId) {
        clearResults.mutate({searchJobId: prevJobId});
    }

    useSearchStore.getState().updateNumSearchResultsTable(0);
    useSearchStore.getState().updateNumSearchResultsMetadata(0);
};

/**
 * Submits a Presto query and updates store state.
 *
 * @param params
 * @param params.clearResults
 * @param params.sql
 * @param params.submitQuery
 * @param params.updateSearchJobId
 * @param params.updateSearchUiState
 * @param params.updateQueryString
 */
const submitPrestoQuery = ({
    clearResults,
    sql,
    submitQuery,
    updateSearchJobId,
    updateSearchUiState,
    updateQueryString,
}: {
    clearResults: ReturnType<typeof useClearPrestoResults>;
    sql: string;
    submitQuery: ReturnType<typeof useSubmitPrestoQuery>;
    updateSearchJobId: (id: string) => void;
    updateSearchUiState: (state: SEARCH_UI_STATE) => void;
    updateQueryString: (qs: string) => void;
}) => {
    clearPreviousResults(clearResults);
    updateQueryString(sql);
    updateSearchUiState(SEARCH_UI_STATE.QUERY_ID_PENDING);

    submitQuery.mutate({queryString: sql}, {
        onSuccess: (data) => {
            updateSearchJobId(String((data as Record<string, unknown>).searchJobId));
            updateSearchUiState(SEARCH_UI_STATE.QUERYING);
        },
        onError: () => {
            updateSearchUiState(SEARCH_UI_STATE.FAILED);
        },
    });
};


/**
 * Guided SQL query form with structured inputs for SELECT, FROM, WHERE, ORDER BY.
 *
 * @param root0
 * @param root0.isQuerying
 * @param root0.onCancel
 */
const GuidedQueryForm = ({
    isQuerying,
    onCancel,
    searchUiState,
}: {
    isQuerying: boolean;
    onCancel: () => void;
    searchUiState: SEARCH_UI_STATE;
}) => {
    const {
        select,
        updateSelect,
        where,
        updateWhere,
        orderBy,
        updateOrderBy,
        timestampKey,
        updateTimestampKey,
        queryDrawerOpen,
        updateQueryDrawerOpen,
    } = usePrestoSearchState();

    const datasetsQuery = useDatasets();
    const availableDatasets = datasetsQuery.data ?? [];
    const [selectedDataset, setSelectedDataset] = useState("default");

    // Fetch timestamp columns for the selected dataset
    const timestampColumnsQuery = useTimestampColumns(selectedDataset);
    const timestampColumns = timestampColumnsQuery.data ?? [];

    // Auto-select first timestamp column when data arrives and none selected
    useEffect(() => {
        if (null === timestampKey && 0 < timestampColumns.length && timestampColumns[0]) {
            updateTimestampKey(timestampColumns[0]);
        }
    }, [timestampColumns,
        timestampKey,
        updateTimestampKey]);

    const submitQuery = useSubmitPrestoQuery();
    const clearResults = useClearPrestoResults();
    const {updateQueryString, updateSearchJobId, updateSearchUiState} = useSearchStore();

    const computedSql = buildSearchQuery({
        booleanExpression: where.trim() || void 0,
        databaseName: selectedDataset,
        endTimestamp: dayjs(),
        selectItemList: select.trim() || "*",
        sortItemList: orderBy.trim() || void 0,
        startTimestamp: dayjs(0),
        timestampKey: timestampKey ?? "timestamp",
    });

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();

        const selectInput = select.trim() || "*";
        const selectErrors = validateSelectItemList(selectInput);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (null !== selectErrors) {
            return;
        }

        if (where.trim()) {
            const whereErrors = validateBooleanExpression(where);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (null !== whereErrors) {
                return;
            }
        }

        const resolvedTimestampKey = timestampKey ?? "timestamp";
        const sql = buildSearchQuery({
            booleanExpression: where.trim() || void 0,
            databaseName: selectedDataset,
            endTimestamp: dayjs(),
            selectItemList: selectInput,
            sortItemList: orderBy.trim() || void 0,
            startTimestamp: dayjs(0),
            timestampKey: resolvedTimestampKey,
        });

        submitPrestoQuery({
            clearResults: clearResults,
            sql: sql,
            submitQuery: submitQuery,
            updateSearchJobId: updateSearchJobId,
            updateQueryString: updateQueryString,
            updateSearchUiState: updateSearchUiState,
        });
    };

    return (
        <form
            className={"space-y-3"}
            onSubmit={handleSubmit}
        >
            <div className={"grid grid-cols-2 gap-3"}>
                <div>
                    <Label className={"mb-1 block"}>SELECT</Label>
                    <Input
                        className={"font-mono"}
                        disabled={isQuerying}
                        placeholder={"*"}
                        value={select}
                        onChange={(e) => {
                            updateSelect(e.target.value);
                        }}/>
                </div>
                <div>
                    <Label className={"mb-1 block"}>FROM (Dataset)</Label>
                    <Select
                        disabled={isQuerying}
                        value={selectedDataset}
                        onValueChange={setSelectedDataset}
                    >
                        <SelectTrigger>
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            {availableDatasets.map((name) => (
                                <SelectItem
                                    key={name}
                                    value={name}
                                >
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className={"mb-1 block"}>WHERE</Label>
                    <Input
                        className={"font-mono"}
                        disabled={isQuerying}
                        placeholder={"Optional boolean expression"}
                        value={where}
                        onChange={(e) => {
                            updateWhere(e.target.value);
                        }}/>
                </div>
                <div>
                    <Label className={"mb-1 block"}>ORDER BY</Label>
                    <Input
                        className={"font-mono"}
                        disabled={isQuerying}
                        placeholder={"Optional sort expression"}
                        value={orderBy}
                        onChange={(e) => {
                            updateOrderBy(e.target.value);
                        }}/>
                </div>
                <div>
                    <Label className={"mb-1 block"}>Timestamp Key</Label>
                    <Select
                        disabled={isQuerying || 0 === timestampColumns.length}
                        value={timestampKey ?? ""}
                        onValueChange={(val) => {
                            updateTimestampKey(val || null);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue
                                placeholder={
                                    0 === timestampColumns.length ?
                                        "No timestamp columns found" :
                                        void 0
                                }/>
                        </SelectTrigger>
                        <SelectContent>
                            {timestampColumns.map((col) => (
                                <SelectItem
                                    key={col}
                                    value={col}
                                >
                                    {col}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Button
                    className={"text-xs text-muted-foreground hover:text-foreground underline"}
                    disabled={isQuerying}
                    size={"sm"}
                    type={"button"}
                    variant={"link"}
                    onClick={() => {
                        updateQueryDrawerOpen(!queryDrawerOpen);
                    }}
                >
                    {queryDrawerOpen ?
                        "Hide Query Preview" :
                        "Preview Query"}
                </Button>
                {queryDrawerOpen && (
                    <pre
                        className={
                            "mt-2 rounded-md bg-muted p-3 text-xs font-mono " +
                        "overflow-x-auto whitespace-pre-wrap break-words"
                        }
                    >
                        {computedSql}
                    </pre>
                )}
            </div>

            <div className={"flex gap-3"}>
                {isQuerying ?
                    (
                        <Button
                            type={"button"}
                            variant={"destructive"}
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    ) :
                    (
                        <Button type={"submit"}>
                            Run Query
                        </Button>
                    )}
                {searchUiState === SEARCH_UI_STATE.QUERY_ID_PENDING && (
                    <span className={"text-sm text-muted-foreground"}>
                        Submitting...
                    </span>
                )}
                {searchUiState === SEARCH_UI_STATE.QUERYING && (
                    <span className={"text-sm text-muted-foreground"}>
                        Querying...
                    </span>
                )}
            </div>
        </form>
    );
};


/**
 * Freeform SQL editor with direct query input.
 *
 * @param root0
 * @param root0.isQuerying
 * @param root0.onCancel
 */
const FreeformQueryForm = ({
    isQuerying,
    onCancel,
}: {
    isQuerying: boolean;
    onCancel: () => void;
}) => {
    const {queryString, updateQueryString, updateSearchJobId, updateSearchUiState} = useSearchStore();
    const submitQuery = useSubmitPrestoQuery();
    const clearResults = useClearPrestoResults();

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!queryString.trim()) {
            return;
        }

        submitPrestoQuery({
            clearResults: clearResults,
            sql: queryString,
            submitQuery: submitQuery,
            updateSearchJobId: updateSearchJobId,
            updateQueryString: updateQueryString,
            updateSearchUiState: updateSearchUiState,
        });
    };

    return (
        <form
            className={"space-y-3"}
            onSubmit={handleSubmit}
        >
            <SqlEditor
                disabled={isQuerying}
                height={120}
                placeholder={"SELECT * FROM default WHERE ..."}
                value={queryString}
                onChange={updateQueryString}/>
            <div className={"flex gap-3"}>
                {isQuerying ?
                    (
                        <Button
                            type={"button"}
                            variant={"destructive"}
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    ) :
                    (
                        <Button
                            disabled={!queryString.trim()}
                            type={"submit"}
                        >
                            Run Query
                        </Button>
                    )}
            </div>
        </form>
    );
};


/**
 * Presto search controls with guided and freeform SQL modes.
 *
 * @return
 */
const PrestoSearchControls = () => {
    const {searchUiState, updateSearchUiState} = useSearchStore();
    const {sqlInterface, setSqlInterface} = usePrestoSearchState();

    const cancelQuery = useCancelPrestoQuery();
    const isQuerying = searchUiState === SEARCH_UI_STATE.QUERY_ID_PENDING ||
        searchUiState === SEARCH_UI_STATE.QUERYING;

    const handleCancel = () => {
        const jobId = useSearchStore.getState().searchJobId;
        if (null !== jobId) {
            cancelQuery.mutate({searchJobId: jobId});
        }

        updateSearchUiState(SEARCH_UI_STATE.DONE);
    };

    return (
        <div className={"space-y-4"}>
            {/* Mode selector */}
            <div className={"flex gap-1 rounded-md border p-1 w-fit"}>
                <Button
                    disabled={isQuerying}
                    size={"sm"}
                    type={"button"}
                    variant={PRESTO_SQL_INTERFACE.GUIDED === sqlInterface ?
                        "default" :
                        "ghost"}
                    onClick={() => {
                        setSqlInterface(PRESTO_SQL_INTERFACE.GUIDED);
                    }}
                >
                    Guided
                </Button>
                <Button
                    disabled={isQuerying}
                    size={"sm"}
                    type={"button"}
                    variant={PRESTO_SQL_INTERFACE.FREEFORM === sqlInterface ?
                        "default" :
                        "ghost"}
                    onClick={() => {
                        setSqlInterface(PRESTO_SQL_INTERFACE.FREEFORM);
                    }}
                >
                    Freeform
                </Button>
            </div>

            {PRESTO_SQL_INTERFACE.GUIDED === sqlInterface ?
                <GuidedQueryForm
                    isQuerying={isQuerying}
                    searchUiState={searchUiState}
                    onCancel={handleCancel}/> :
                <FreeformQueryForm
                    isQuerying={isQuerying}
                    onCancel={handleCancel}/>}
        </div>
    );
};


export {PrestoSearchControls};
