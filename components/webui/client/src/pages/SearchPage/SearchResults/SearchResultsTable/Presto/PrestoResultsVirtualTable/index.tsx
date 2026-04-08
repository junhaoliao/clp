import {useCallback, useEffect} from "react";

import type {PrestoSearchResult} from "@webui/common/presto";

import VirtualTable from "../../../../../../components/VirtualTable";
import {VirtualScrollInfo} from "../../../../../../components/VirtualTable/typings";
import useSearchStore from "../../../../SearchState/index";
import {usePrestoSearchResults} from "./usePrestoSearchResults";
import {getPrestoSearchResultsTableColumns} from "./utils";


interface PrestoResultsVirtualTableProps {
    tableHeight: number;
}

/**
 * Renders Presto search results in a virtual table with lazy loading.
 *
 * @param props
 * @param props.tableHeight
 * @return
 */
const PrestoResultsVirtualTable = ({tableHeight}: PrestoResultsVirtualTableProps) => {
    const {updateNumSearchResultsTable} = useSearchStore();
    const {data: prestoSearchResults, loadMore, hasMore, isLoadingMore} = usePrestoSearchResults();

    const columns = getPrestoSearchResultsTableColumns(prestoSearchResults || []);

    useEffect(() => {
        const num = prestoSearchResults ?
            prestoSearchResults.length :
            0;

        updateNumSearchResultsTable(num);
    }, [
        prestoSearchResults,
        updateNumSearchResultsTable,
    ]);

    const handleScroll = useCallback(({scrollTop, scrollHeight, clientHeight}: VirtualScrollInfo) => {
        if (!hasMore || isLoadingMore) {
            return;
        }

        if (scrollHeight - scrollTop - clientHeight < 200) {
            loadMore();
        }
    }, [hasMore, isLoadingMore, loadMore]);

    return (
        <VirtualTable<PrestoSearchResult>
            columns={columns}
            dataSource={prestoSearchResults || []}
            onVirtualScroll={handleScroll}
            pagination={false}
            rowKey={(record) => record._id}
            scroll={{y: tableHeight, x: "max-content"}}/>
    );
};

export default PrestoResultsVirtualTable;
