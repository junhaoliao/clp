import {useState} from "react";

import {CLP_STORAGE_ENGINES} from "@webui/common/config";
import {Dayjs} from "dayjs";

import {SETTINGS_STORAGE_ENGINE} from "../../config";
import {computeTimelineConfig} from "./SearchResults/SearchResultsTimeline/utils";
import {handleQuerySubmit} from "./SearchControls/Native/search-requests";
import {
    TIME_RANGE_OPTION,
    TIME_RANGE_OPTION_DAYJS_MAP,
} from "./SearchControls/TimeRangeInput/utils";
import useSearchStore from "./SearchState";
import {SEARCH_UI_STATE} from "./SearchState/typings";


type UseKqlQueryReturn = {
    queryString: string;
    submitQuery: (query: string) => void;
};

/**
 * Builds the CLP-S projection list for Explore table fields.
 *
 * @param selectedFields
 * @return Projection columns.
 */
const buildSearchProjection = (selectedFields: string[]): string[] => {
    if (0 === selectedFields.length) {
        return [];
    }

    return [...new Set([
        ...selectedFields,
        "message",
    ])];
};

/**
 * Resolves the current time range selector state into search request fields.
 *
 * @return Query time bounds and timeline bucket size.
 */
const buildTimeRangeQueryParams = async () => {
    const store = useSearchStore.getState();
    let newTimeRange: [Dayjs, Dayjs];

    if (store.timeRangeOption !== TIME_RANGE_OPTION.CUSTOM) {
        newTimeRange = await TIME_RANGE_OPTION_DAYJS_MAP[store.timeRangeOption]();
        store.updateTimeRange(newTimeRange);
    } else {
        newTimeRange = store.timeRange;
    }

    const newTimelineConfig = computeTimelineConfig(newTimeRange);
    store.updateTimelineConfig(newTimelineConfig);

    if (store.timeRangeOption === TIME_RANGE_OPTION.ALL_TIME) {
        return {
            timeRangeBucketSizeMillis: newTimelineConfig.bucketDuration.asMilliseconds(),
            timestampBegin: null,
            timestampEnd: null,
        };
    }

    return {
        timeRangeBucketSizeMillis: newTimelineConfig.bucketDuration.asMilliseconds(),
        timestampBegin: newTimeRange[0].valueOf(),
        timestampEnd: newTimeRange[1].valueOf(),
    };
};

/**
 * Submits a search to the backend using the current store state.
 *
 * @param queryString
 * @param projection
 */
const submitSearch = async (queryString: string, projection: string[] = []) => {
    const store = useSearchStore.getState();

    if (store.searchUiState !== SEARCH_UI_STATE.DEFAULT &&
        store.searchUiState !== SEARCH_UI_STATE.DONE &&
        store.searchUiState !== SEARCH_UI_STATE.FAILED) {
        return;
    }

    if (CLP_STORAGE_ENGINES.CLP_S === SETTINGS_STORAGE_ENGINE &&
        0 === store.selectedDatasets.length) {
        console.error("Cannot submit a clp-s query without a dataset selection.");

        return;
    }

    store.updateQueriedDatasets(store.selectedDatasets);
    store.updateQueryString(queryString);

    let timeRangeParams: Awaited<ReturnType<typeof buildTimeRangeQueryParams>>;
    try {
        timeRangeParams = await buildTimeRangeQueryParams();
    } catch (err: unknown) {
        console.error("Failed to resolve query time range:", err);

        return;
    }

    handleQuerySubmit({
        datasets: store.selectedDatasets,
        ignoreCase: false === store.queryIsCaseSensitive,
        projection: buildSearchProjection(projection),
        queryString: queryString || "*",
        ...timeRangeParams,
    });
};

/**
 * Manages KQL query string and integrates with the standard search flow.
 *
 * @return KQL query state and handlers.
 */
const useKqlQuery = (selectedFields: string[] = []): UseKqlQueryReturn => {
    const [queryString, setQueryString] = useState("");

    const submitQuery = (query: string) => {
        setQueryString(query);
        submitSearch(query, selectedFields).catch((err: unknown) => {
            throw err;
        });
    };

    return {
        queryString,
        submitQuery,
    };
};


export {
    buildSearchProjection,
    useKqlQuery,
};
