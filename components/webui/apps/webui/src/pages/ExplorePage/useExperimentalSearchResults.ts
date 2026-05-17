import {useEffect} from "react";

import {useCursor} from "../../api/socket/useCursor";
import MongoSocketCollection from "../../api/socket/MongoSocketCollection";
import useSearchStore, {SEARCH_STATE_DEFAULT} from "./SearchState";
import {SEARCH_MAX_NUM_RESULTS} from "./SearchResults/SearchResultsTable/typings";
import {SearchResult} from "./SearchResults/SearchResultsTable/Native/SearchResultsVirtualTable/typings";

/**
 * Subscribes to Socket.IO search result updates and syncs them to the search store.
 *
 * In experimental mode, ExploreTabs renders LogsDataTable instead of the old
 * SearchResultsVirtualTable, so the useSearchResults/useCursor hooks in that
 * component never run. This hook fills that gap by subscribing when experimental
 * mode is active. In non-experimental mode, this is a no-op (the old table's
 * own subscription handles result delivery).
 *
 * @param isEnabled Whether experimental mode is active.
 */
const useExperimentalSearchResults = (isEnabled: boolean): void => {
    const {searchJobId} = useSearchStore();
    const {
        updateNumSearchResultsTable,
        updateSearchResults,
    } = useSearchStore();

    const searchResultsCursor = useCursor<SearchResult>(
        () => {
            if (!isEnabled) {
                return null;
            }

            if (searchJobId === SEARCH_STATE_DEFAULT.searchJobId) {
                return null;
            }

            const options = {
                sort: [
                    ["timestamp", "desc"],
                    ["_id", "desc"],
                ],
                limit: SEARCH_MAX_NUM_RESULTS,
            };

            const collection = new MongoSocketCollection(searchJobId);
            return collection.find({}, options);
        },
        [searchJobId, isEnabled],
    );

    useEffect(() => {
        if (!isEnabled) {
            return;
        }

        const num = searchResultsCursor ?
            searchResultsCursor.length :
            0;

        updateNumSearchResultsTable(num);
        updateSearchResults(searchResultsCursor);
    }, [
        searchResultsCursor,
        isEnabled,
        updateNumSearchResultsTable,
        updateSearchResults,
    ]);
};

export {useExperimentalSearchResults};
