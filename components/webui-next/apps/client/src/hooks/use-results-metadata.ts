import type {SearchResultsMetadataDocument} from "@clp/webui-shared";

import MongoSocketCollection from "../api/socket/MongoSocketCollection";
import {settings} from "../settings";
import useSearchStore, {SEARCH_STATE_DEFAULT} from "../stores/search-store";
import {useCursor} from "./use-cursor";


/**
 * Custom hook to get result metadata for the current searchJobId.
 *
 * Subscribes to the `results-metadata` MongoDB collection via socket.io
 * and returns the metadata document for the current search job.
 *
 * @return The metadata document, or null if there is no active search job.
 */
const useResultsMetadata = (): SearchResultsMetadataDocument | null => {
    const {searchJobId} = useSearchStore();

    const resultsMetadataCursor = useCursor<SearchResultsMetadataDocument>(
        () => {
            // If there is no active search job, there is no metadata to fetch.
            if (searchJobId === SEARCH_STATE_DEFAULT.searchJobId) {
                return null;
            }

            const collection = new MongoSocketCollection(
                settings.MongoDbSearchResultsMetadataCollectionName,
            );

            return collection.find({_id: searchJobId}, {limit: 1});
        },
        [searchJobId],
    );

    // If there is no metadata, return null.
    if (null === resultsMetadataCursor ||
        (Array.isArray(resultsMetadataCursor) && 0 === resultsMetadataCursor.length)
    ) {
        return null;
    }

    const [resultsMetadata] = resultsMetadataCursor;

    if ("undefined" === typeof resultsMetadata) {
        return null;
    }

    return resultsMetadata;
};


export {useResultsMetadata};
