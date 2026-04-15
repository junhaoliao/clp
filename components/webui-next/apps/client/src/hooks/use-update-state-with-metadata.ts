import {useEffect} from "react";

import {SEARCH_SIGNAL} from "@clp/webui-shared";

import useSearchStore, {SEARCH_UI_STATE} from "../stores/search-store";
import {useResultsMetadata} from "./use-results-metadata";


/**
 * Custom hook to update the client state based on results metadata from the server.
 *
 * - Sets the UI state to `DONE` when the results metadata signal indicates that the query is
 * complete, or `FAILED` if the query fails.
 * - Updates the number of search results from the metadata.
 */
const useUpdateStateWithMetadata = () => {
    const {
        updateNumSearchResultsMetadata,
        updateSearchUiState,
    } = useSearchStore();

    const resultsMetadata = useResultsMetadata();

    useEffect(() => {
        if (null === resultsMetadata) {
            return;
        }

        const {searchUiState} = useSearchStore.getState();

        if (SEARCH_UI_STATE.DEFAULT === searchUiState) {
            return;
        }

        if ("undefined" !== typeof resultsMetadata.numTotalResults) {
            updateNumSearchResultsMetadata(resultsMetadata.numTotalResults);
        }

        switch (resultsMetadata.lastSignal) {
            case SEARCH_SIGNAL.RESP_DONE:
                updateSearchUiState(SEARCH_UI_STATE.DONE);
                break;
            default:
                break;
        }
    }, [
        resultsMetadata,
        updateNumSearchResultsMetadata,
        updateSearchUiState,
    ]);
};


export {useUpdateStateWithMetadata};
