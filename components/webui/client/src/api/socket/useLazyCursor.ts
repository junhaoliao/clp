import {
    DependencyList,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {Nullable} from "@webui/common/utility-types";

import {MongoSocketCursor} from "./MongoSocketCursor";


/**
 * Result of a lazy-loading cursor hook.
 *
 * @template T The document type returned by the cursor.
 */
interface UseLazyCursorReturn<T> {
    /**
     * Accumulated results from the subscription, or null while pending.
     */
    data: Nullable<T[]>;

    /**
     * Whether all available results have been loaded.
     */
    hasMore: boolean;

    /**
     * Whether a loadMore request is in flight.
     */
    isLoadingMore: boolean;

    /**
     * Requests the next batch of results by increasing the query limit.
     */
    loadMore: () => void;
}

/**
 * Options for the lazy cursor query factory.
 */
interface LazyCursorQueryResult {
    cursor: MongoSocketCursor;
    initialLimit: number;
}


/**
 * Custom hook which returns a real-time reactive array of documents from a `MongoSocketCursor`
 * with support for incremental (lazy) loading via `loadMore()`.
 *
 * @template T The document type returned by the cursor.
 * @param query Function which returns a `MongoSocketCursor` instance with `initialLimit`, or null.
 * @param dependencies Array of dependencies for the query.
 * @param batchSize Number of additional results to request on each `loadMore()` call.
 * @return
 */
const useLazyCursor = <T = object>(
    query: () => Nullable<LazyCursorQueryResult>,
    dependencies: DependencyList = [],
    batchSize: number = 10,
): UseLazyCursorReturn<T> => {
    const [data, setData] = useState<Nullable<T[]>>(null);
    const currentLimitRef = useRef<number>(0);
    const isLoadingMoreRef = useRef<boolean>(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const cursorRef = useRef<Nullable<MongoSocketCursor>>(null);

    useEffect(() => {
        const queryResult = query();
        cursorRef.current = queryResult?.cursor ?? null;
        currentLimitRef.current = queryResult?.initialLimit ?? 0;
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);

        if (null === queryResult) {
            setData(null);

            return () => {};
        }

        // Flag to ignore updates after unmounting.
        let ignore = false;

        // Handler to set data updates from the server.
        const onDataUpdate = (dataUpdate: object[]) => {
            if (false === ignore) {
                setData(dataUpdate as T[]);
                if (isLoadingMoreRef.current) {
                    isLoadingMoreRef.current = false;
                    setIsLoadingMore(false);
                }
            }
        };

        const subscribed = queryResult.cursor.subscribe(onDataUpdate);

        subscribed.catch((error: unknown) => {
            console.error("Error during subscription:", error);
        });

        return () => {
            ignore = true;

            // For a shortly lived cursor (ex. strict mode), the subscription may have not yet
            // recieved the queryID from the server, making it impossible to unsubscribe
            // immediately (there is no queryID). The subscribed promise allows unsubcription
            // to happen when the subscription actually completes.
            subscribed
                .then(() => {
                    // Unsubscribe will not run if the subscription failed since the promise was
                    // rejected.
                    queryResult.cursor.unsubscribe();
                })
                .catch((error: unknown) => {
                    console.error("Error during unsubscription:", error);
                });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);

    const loadMore = useCallback(() => {
        if (null === cursorRef.current || isLoadingMoreRef.current) {
            return;
        }

        const newLimit = currentLimitRef.current + batchSize;
        currentLimitRef.current = newLimit;
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        cursorRef.current.loadMore(newLimit);
    }, [batchSize]);

    // hasMore: if data is loaded and its length equals the current limit, there might be more.
    // If data length < current limit, we've reached the end.
    const hasMore = null !== data && data.length >= currentLimitRef.current;

    return {data, hasMore, isLoadingMore, loadMore};
};


export {useLazyCursor};
export type {UseLazyCursorReturn};
