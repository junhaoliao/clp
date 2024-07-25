import {Meteor} from "meteor/meteor";
import {useEffect} from "react";
import Table from "react-bootstrap/Table";

import dayjs from "dayjs";

import {
    faSort,
    faSortDown,
    faSortUp,
    faSquareUpRight,
} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import {
    MONGO_SORT_ORDER,
    SEARCH_RESULTS_FIELDS,
} from "/imports/api/search/constants";
import {DATETIME_FORMAT_TEMPLATE} from "/imports/utils/datetime";

import SearchResultsLoadSensor from "./SearchResultsLoadSensor";

import "./SearchResultsTable.scss";


/**
 * For calculating max message height from `maxLinesPerResult`.
 */
const SEARCH_RESULT_MESSAGE_LINE_HEIGHT = 1.5;

/**
 * Represents a table component to display search results.
 *
 * @param {object} props
 * @param {object} props.fieldToSortBy
 * @param {boolean} props.hasMoreResultsInCache
 * @param {boolean} props.hasMoreResultsInTotal
 * @param {number} props.maxLinesPerResult
 * @param {Function} props.onLoadMoreResults
 * @param {object[]} props.searchResults
 * @param {Function} props.setFieldToSortBy
 * @return {React.ReactElement}
 */
const SearchResultsTable = ({
    fieldToSortBy,
    hasMoreResultsInCache,
    hasMoreResultsInTotal,
    maxLinesPerResult,
    onLoadMoreResults,
    searchResults,
    setFieldToSortBy,
}) => {
    const getSortIcon = (fieldName) => {
        if (fieldName === fieldToSortBy.name) {
            return (MONGO_SORT_ORDER.ASCENDING === fieldToSortBy.direction) ?
                faSortUp :
                faSortDown;
        }

        return faSort;
    };

    const toggleSortDirection = (event) => {
        const {columnName} = event.currentTarget.dataset;
        if (fieldToSortBy.name !== columnName) {
            setFieldToSortBy({
                name: columnName,
                direction: (SEARCH_RESULTS_FIELDS.TIMESTAMP === columnName) ?
                    MONGO_SORT_ORDER.DESCENDING :
                    MONGO_SORT_ORDER.ASCENDING,
            });
        } else {
            setFieldToSortBy({
                name: columnName,
                direction: (MONGO_SORT_ORDER.ASCENDING === fieldToSortBy.direction) ?
                    MONGO_SORT_ORDER.DESCENDING :
                    MONGO_SORT_ORDER.ASCENDING,
            });
        }
    };

    const handleSearchResultClick = (ev) => {
        const {orig_file_id: origFileId, log_event_idx: logEventIdx} = ev.currentTarget.dataset;
        window.open(`${Meteor.settings.public.LogViewerWebuiUrl
        }?origFileId=${origFileId}&logEventIdx=${logEventIdx}`);
    };

    useEffect(() => {
        document.documentElement.style.setProperty(
            "--search-results-message-line-height",
            `${SEARCH_RESULT_MESSAGE_LINE_HEIGHT}rem`
        );
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty(
            "--search-results-message-max-height",
            `${(SEARCH_RESULT_MESSAGE_LINE_HEIGHT * maxLinesPerResult)}rem`
        );
    }, [maxLinesPerResult]);

    return (
        <div className={"search-results-container"}>
            <Table
                className={"border-bottom search-results"}
                hover={true}
                responsive={"sm"}
                striped={true}
            >
                <thead>
                    <tr>
                        <th
                            className={"search-results-th search-results-th-sortable"}
                            data-column-name={SEARCH_RESULTS_FIELDS.TIMESTAMP}
                            onClick={toggleSortDirection}
                        >
                            <div className={"search-results-table-header"}>
                                <FontAwesomeIcon
                                    icon={getSortIcon(SEARCH_RESULTS_FIELDS.TIMESTAMP)}/>
                                <span> Timestamp</span>
                            </div>
                        </th>
                        <th
                            className={"search-results-th"}
                        >
                            <div className={"search-results-table-header"}>
                                Log message
                            </div>
                        </th>
                        <th className={"search-results-th"}>
                            <div className={"search-results-table-header"}>&nbsp;</div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {searchResults.map((result) => (
                        <tr key={result._id}>
                            <td className={"search-results-content search-results-timestamp"}>
                                {result.timestamp ?
                                    dayjs.utc(result.timestamp).format(DATETIME_FORMAT_TEMPLATE) :
                                    "N/A"}
                            </td>
                            <td>
                                <pre
                                    className={"search-results-content search-results-message"}
                                >
                                    {result.message}
                                </pre>
                            </td>
                            <td>
                                <a
                                    className={"search-results-content-clickable"}
                                    data-log_event_idx={result.log_event_ix}
                                    data-orig_file_id={result.orig_file_id}
                                    title={"Go to the log context"}
                                    onClick={handleSearchResultClick}
                                >
                                    <FontAwesomeIcon icon={faSquareUpRight}/>
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <SearchResultsLoadSensor
                hasMoreResultsInCache={hasMoreResultsInCache}
                hasMoreResultsInTotal={hasMoreResultsInTotal}
                onLoadMoreResults={onLoadMoreResults}/>
        </div>
    );
};

export default SearchResultsTable;
