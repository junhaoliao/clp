import type React from "react";

import dayjs from "dayjs";

import {
    useCancelSearchQuery,
    useClearSearchResults,
    useSubmitSearchQuery,
} from "../../../api";
import useSearchStore, {
    computeTimelineConfig,
    SEARCH_UI_STATE,
    TIME_RANGE_OPTION,
} from "../../../stores/search-store";
import {unquoteString} from "../utils/unquoteString";


/**
 * Resets result counts in the search store.
 */
const resetResultCounts = () => {
    const store = useSearchStore.getState();
    store.updateNumSearchResultsTable(0);
    store.updateNumSearchResultsTimeline(0);
    store.updateNumSearchResultsMetadata(0);
};

interface MutationPayloadInput {
    bucketSize: number;
    queryIsCaseSensitive: boolean;
    queryString: string;
    selectedDatasets: string[];
    timeRange: [dayjs.Dayjs, dayjs.Dayjs];
    timeRangeOption: TIME_RANGE_OPTION;
}

/**
 * Builds the mutation payload for a search query.
 *
 * @param input
 * @return
 */
const buildMutationPayload = (input: MutationPayloadInput) => ({
    datasets: 0 < input.selectedDatasets.length ?
        input.selectedDatasets :
        ["default"],
    ignoreCase: !input.queryIsCaseSensitive,
    queryString: unquoteString(input.queryString),
    timeRangeBucketSizeMillis: input.bucketSize,
    timestampBegin: TIME_RANGE_OPTION.ALL_TIME === input.timeRangeOption ?
        null :
        input.timeRange[0].valueOf(),
    timestampEnd: TIME_RANGE_OPTION.ALL_TIME === input.timeRangeOption ?
        null :
        input.timeRange[1].valueOf(),
});


/**
 * Hook that provides search submit and cancel handlers.
 *
 * @return
 */
const useSearchSubmit = () => {
    const store = useSearchStore();
    const submitQuery = useSubmitSearchQuery();
    const cancelQuery = useCancelSearchQuery();
    const clearResults = useClearSearchResults();

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!store.queryString.trim()) {
            return;
        }
        if (null !== store.searchJobId && null !== store.aggregationJobId) {
            clearResults.mutate({
                aggregationJobId: store.aggregationJobId,
                searchJobId: store.searchJobId,
            });
        }
        resetResultCounts();
        const config = computeTimelineConfig(store.timeRange);
        store.updateTimelineConfig(config);
        store.updateSearchUiState(SEARCH_UI_STATE.QUERY_ID_PENDING);
        store.updateQueriedDatasets(store.selectedDatasets);
        submitQuery.mutate(
            buildMutationPayload({
                bucketSize: config.bucketSize,
                queryIsCaseSensitive: store.queryIsCaseSensitive,
                queryString: store.queryString,
                selectedDatasets: store.selectedDatasets,
                timeRange: store.timeRange,
                timeRangeOption: store.timeRangeOption,
            }),
            {
                onSuccess: (data) => {
                    store.updateSearchJobId(String(data.searchJobId));
                    store.updateAggregationJobId(String(data.aggregationJobId));
                    store.updateSearchUiState(SEARCH_UI_STATE.QUERYING);
                },
                onError: () => {
                    store.updateSearchUiState(SEARCH_UI_STATE.FAILED);
                },
            },
        );
    };

    const handleCancel = () => {
        if (null !== store.searchJobId && null !== store.aggregationJobId) {
            cancelQuery.mutate({
                searchJobId: Number(store.searchJobId),
                aggregationJobId: Number(store.aggregationJobId),
            });
        }
        store.updateSearchUiState(SEARCH_UI_STATE.DONE);
    };

    return {handleCancel, handleSubmit};
};


export {useSearchSubmit};
