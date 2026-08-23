import {useQueryResults} from "@webui/api-client/useQueryResults";

import {apiClient} from "../../../../../api/search";
import {TimelineBucket} from "../../../../../components/ResultsTimeline/typings";
import {handleNativeQueryStreamError} from "../../../SearchControls/Native/search-requests";
import useSearchStore from "../../../SearchState/index";


/**
 * Custom hook to stream aggregation results for the current aggregationJobId from the API
 * server's SSE endpoint.
 *
 * @return
 */
const useAggregationResults = () => {
    const aggregationJobId = useSearchStore((state) => state.aggregationJobId);

    return useQueryResults<TimelineBucket>(apiClient, aggregationJobId, {
        onDone: () => {
            if (null !== aggregationJobId) {
                useSearchStore.getState().markAggregationResultsComplete(aggregationJobId);
            }
        },
        onError: (err) => {
            console.error("Failed to stream aggregation results:", err);
            if (null !== aggregationJobId) {
                // eslint-disable-next-line no-void
                void handleNativeQueryStreamError({
                    jobId: aggregationJobId,
                    stream: "aggregation",
                });
            }
        },
        parse: (data) => JSON.parse(data) as TimelineBucket,
        rawDocs: true,
        sorted: false,
    });
};

export {useAggregationResults};
