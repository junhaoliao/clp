import {
    useEffect,
    useMemo,
    useRef,
} from "react";

import {CLP_STORAGE_ENGINES} from "@clp/webui-shared";

import {useDatasets} from "../../../api";
import {Button} from "../../../components/ui/button";
import {
    SETTINGS_MAX_DATASETS_PER_QUERY,
    SETTINGS_STORAGE_ENGINE,
} from "../../../config";
import useSearchStore, {SEARCH_UI_STATE} from "../../../stores/search-store";
import {useSearchSubmit} from "../hooks/use-search-submit";
import {DatasetSelector} from "./DatasetSelector";
import {QueryInput} from "./QueryInput";
import {StatusRow} from "./StatusRow";
import {TimeRangePicker} from "./TimeRangePicker";


/**
 * Search form controls in a horizontal layout matching the original webui:
 * Dataset | Query + Aa | First/Last Timestamp | Search
 *
 * @return
 */
const SearchControls = () => {
    const {
        queryString,
        updateQueryString,
        queryIsCaseSensitive,
        updateQueryIsCaseSensitive,
        selectedDatasets,
        timeRangeOption,
        updateTimeRangeOption,
        timeRange,
        updateTimeRange,
        searchUiState,
    } = useSearchStore();

    const datasetsQuery = useDatasets();
    const {handleCancel, handleSubmit} = useSearchSubmit();
    const isQuerying = searchUiState === SEARCH_UI_STATE.QUERY_ID_PENDING ||
        searchUiState === SEARCH_UI_STATE.QUERYING;
    const isClpS = CLP_STORAGE_ENGINES.CLP_S === SETTINGS_STORAGE_ENGINE;

    const availableDatasets = useMemo(() => datasetsQuery.data ?? [], [datasetsQuery.data]);
    const queryInputRef = useRef<HTMLInputElement>(null);

    // Auto-select "default" dataset on first load
    useEffect(() => {
        if (
            0 === selectedDatasets.length &&
            0 < availableDatasets.length &&
            availableDatasets.includes("default")
        ) {
            useSearchStore.getState().updateSelectedDatasets(["default"]);
        }
    }, [availableDatasets,
        selectedDatasets.length]);

    // Auto-focus query input when search completes
    useEffect(() => {
        if (
            searchUiState === SEARCH_UI_STATE.DEFAULT ||
            searchUiState === SEARCH_UI_STATE.DONE ||
            searchUiState === SEARCH_UI_STATE.FAILED
        ) {
            queryInputRef.current?.focus();
        }
    }, [searchUiState]);

    const toggleDataset = (name: string) => {
        if (selectedDatasets.includes(name)) {
            if (1 < selectedDatasets.length) {
                useSearchStore.getState().updateSelectedDatasets(
                    selectedDatasets.filter((d) => d !== name),
                );
            }
        } else {
            useSearchStore.getState().updateSelectedDatasets([...selectedDatasets,
                name]);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className={"flex flex-col gap-1"}>
                {/* Main controls row */}
                <div className={"flex items-center gap-2.5 flex-wrap"}>
                    {isClpS && (
                        <DatasetSelector
                            availableDatasets={availableDatasets}
                            disabled={isQuerying}
                            selectedDatasets={selectedDatasets}
                            onToggleDataset={toggleDataset}/>
                    )}

                    {isClpS && null !== SETTINGS_MAX_DATASETS_PER_QUERY &&
                        selectedDatasets.length > SETTINGS_MAX_DATASETS_PER_QUERY && (
                        <span className={"text-xs text-destructive"}>
                            {`Max ${SETTINGS_MAX_DATASETS_PER_QUERY} datasets per query`}
                        </span>
                    )}

                    <QueryInput
                        disabled={isQuerying}
                        inputRef={queryInputRef}
                        isCaseSensitive={queryIsCaseSensitive}
                        query={queryString}
                        onCaseSensitiveChange={updateQueryIsCaseSensitive}
                        onQueryChange={updateQueryString}/>

                    <TimeRangePicker
                        disabled={isQuerying}
                        timeRange={timeRange}
                        timeRangeOption={timeRangeOption}
                        onTimeRangeChange={updateTimeRange}
                        onTimeRangeOptionChange={updateTimeRangeOption}/>

                    <div className={"min-w-[80px]"}>
                        {isQuerying ?
                            (
                                <Button
                                    type={"button"}
                                    variant={"outline"}
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                            ) :
                            (
                                <Button
                                    disabled={!queryString.trim()}
                                    type={"submit"}
                                >
                                    Search
                                </Button>
                            )}
                    </div>
                </div>

                <StatusRow uiState={searchUiState}/>
            </div>
        </form>
    );
};


export {SearchControls};
