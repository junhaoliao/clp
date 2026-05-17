import {useState} from "react";

import {CLP_STORAGE_ENGINES} from "@webui/common/config";

import {SETTINGS_STORAGE_ENGINE} from "../../config";
import {handleQuerySubmit} from "./SearchControls/Native/search-requests";
import useSearchStore from "./SearchState";
import {SEARCH_UI_STATE} from "./SearchState/typings";


type UseKqlQueryReturn = {
    addPatternFilter: (logtypeId: number) => void;
    queryString: string;
    removePatternFilter: (logtypeId: number) => void;
    submitQuery: (query: string) => void;
};

/**
 * Submits a search to the backend using the current store state.
 *
 * @param queryString
 */
const submitSearch = (queryString: string) => {
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

    handleQuerySubmit({
        datasets: store.selectedDatasets,
        ignoreCase: true,
        queryString: queryString || "*",
        timeRangeBucketSizeMillis: store.timelineConfig.bucketDuration.asMilliseconds(),
        timestampBegin: null,
        timestampEnd: null,
    });
};

/**
 * Manages KQL query string and integrates with the standard search flow.
 *
 * @return KQL query state and handlers.
 */
const useKqlQuery = (): UseKqlQueryReturn => {
    const [queryString, setQueryString] = useState("");

    const submitQuery = (query: string) => {
        setQueryString(query);
        submitSearch(query);
    };

    const addPatternFilter = (logtypeId: number) => {
        const clause = `logtype_id: ${logtypeId}`;
        const newQuery = 0 < queryString.length ?
            `${queryString} or ${clause}` :
            clause;

        setQueryString(newQuery);
        submitSearch(newQuery);
    };

    const removePatternFilter = (logtypeId: number) => {
        const clause = `not logtype_id: ${logtypeId}`;
        const newQuery = 0 < queryString.length ?
            `${queryString} and ${clause}` :
            clause;

        setQueryString(newQuery);
        submitSearch(newQuery);
    };

    return {
        addPatternFilter,
        queryString,
        removePatternFilter,
        submitQuery,
    };
};


export {useKqlQuery};
