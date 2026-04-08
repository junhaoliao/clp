import {
    useCallback,
    useEffect,
    useMemo,
} from "react";

import {useDocumentMessages} from "../../../../../../api/socket/useDocumentMessages";
import VirtualTable from "../../../../../../components/VirtualTable";
import {VirtualScrollInfo} from "../../../../../../components/VirtualTable/typings";
import useSearchStore, {SEARCH_STATE_DEFAULT} from "../../../../SearchState/index";
import {SCROLL_LOAD_MORE_THRESHOLD_PX} from "../../typings";
import {
    SearchResult,
    searchResultsTableColumns,
} from "./typings";
import {useSearchResults} from "./useSearchResults";


interface SearchResultsVirtualTableProps {
    tableHeight: number;
}

/**
 * Renders search results in a virtual table with lazy loading.
 *
 * @param props
 * @param props.tableHeight
 * @return
 */
const SearchResultsVirtualTable = ({tableHeight}: SearchResultsVirtualTableProps) => {
    const {searchJobId, updateNumSearchResultsTable} = useSearchStore();
    const {data: searchResults, loadMore, hasMore, isLoadingMore} = useSearchResults();

    // Fetch messages individually for each document after the lightweight cursor provides IDs.
    const docIds = useMemo(
        () => (searchResults ?? []).map((r) => r._id),
        [searchResults]
    );

    const collectionName = SEARCH_STATE_DEFAULT.searchJobId === searchJobId ?
        null :
        searchJobId;
    const messages = useDocumentMessages(collectionName, docIds);

    // Merge messages into the lightweight cursor data.
    const mergedResults = useMemo(() => {
        if (null === searchResults) {
            return [];
        }
        if (null === messages) {
            return searchResults;
        }

        return searchResults.map((r) => {
            const msg = messages.get(r._id);

            return "undefined" === typeof msg ?
                r :
                {...r, message: msg};
        });
    }, [searchResults,
        messages]);

    useEffect(() => {
        const num = searchResults ?
            searchResults.length :
            0;

        updateNumSearchResultsTable(num);
    }, [
        searchResults,
        updateNumSearchResultsTable,
    ]);

    const handleScroll = useCallback((
        {scrollTop, scrollHeight, clientHeight}: VirtualScrollInfo
    ) => {
        if (!hasMore || isLoadingMore) {
            return;
        }

        if (SCROLL_LOAD_MORE_THRESHOLD_PX > scrollHeight - scrollTop - clientHeight) {
            loadMore();
        }
    }, [
        hasMore,
        isLoadingMore,
        loadMore,
    ]);

    return (
        <VirtualTable<SearchResult>
            columns={searchResultsTableColumns}
            dataSource={mergedResults}
            pagination={false}
            rowKey={(record) => record._id}
            scroll={{y: tableHeight, x: "max-content"}}
            onVirtualScroll={handleScroll}/>
    );
};

export default SearchResultsVirtualTable;
