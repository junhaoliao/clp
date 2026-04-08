import MongoSocketCollection from "../../../../../../api/socket/MongoSocketCollection";
import {useLazyCursor} from "../../../../../../api/socket/useLazyCursor";
import {PrestoSearchResult} from "@webui/common/presto";
import useSearchStore, {SEARCH_STATE_DEFAULT} from "../../../../SearchState/index";
import {SEARCH_RESULTS_BATCH_SIZE} from "../../typings";


/**
 * Custom hook to get Presto search results for the current searchJobId with lazy loading support.
 *
 * @return
 */
const usePrestoSearchResults = () => {
    const searchJobId = useSearchStore((state) => state.searchJobId);

    return useLazyCursor<PrestoSearchResult>(
        () => {
            // If there is no active search job, there are no results to fetch. The cursor will
            // return null.
            if (searchJobId === SEARCH_STATE_DEFAULT.searchJobId) {
                return null;
            }

            console.log(
                `Subscribing to updates to Presto search results with job ID: ${searchJobId}`
            );

            // Retrieve initial batch of results sorted by _id descending.
            const options = {
                sort: [
                    [
                        "_id",
                        "desc",
                    ],
                ],
                limit: SEARCH_RESULTS_BATCH_SIZE,
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


export {usePrestoSearchResults};
