import MongoSocketCollection from "../../../../../../api/socket/MongoSocketCollection";
import {useLazyCursor} from "../../../../../../api/socket/useLazyCursor";
import useSearchStore, {SEARCH_STATE_DEFAULT} from "../../../../SearchState/index";
import {SEARCH_RESULTS_BATCH_SIZE} from "../../typings";
import {SearchResult} from "./typings";


/**
 * Custom hook to get search results for the current searchJobId with lazy loading support.
 *
 * @return
 */
const useSearchResults = () => {
    const {searchJobId} = useSearchStore();

    return useLazyCursor<SearchResult>(
        () => {
            // If there is no active search job, there are no results to fetch. The cursor will
            // return null.
            if (searchJobId === SEARCH_STATE_DEFAULT.searchJobId) {
                return null;
            }

            console.log(
                `Subscribing to updates to search results with job ID: ${searchJobId}`
            );

            // Retrieve initial batch of results sorted by timestamp descending.
            const options = {
                sort: [
                    [
                        "timestamp",
                        "desc",
                    ],
                    [
                        "_id",
                        "desc",
                    ],
                ],
                limit: SEARCH_RESULTS_BATCH_SIZE,
                projection: {message: 0},
            };

            const collection = new MongoSocketCollection(searchJobId);

            return {
                cursor: collection.find({}, options),
                initialLimit: SEARCH_RESULTS_BATCH_SIZE,
            };
        },
        [searchJobId],
        SEARCH_RESULTS_BATCH_SIZE,
    );
};


export {useSearchResults};
