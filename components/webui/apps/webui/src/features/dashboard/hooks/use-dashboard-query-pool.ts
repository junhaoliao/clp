import {
    useCallback,
    useRef,
} from "react";


const HTTP1_CONCURRENCY_LIMIT = 5;

/**
 *
 */
function getConcurrentPanelFetchLimit (): number {
    // HTTP/2+ supports multiplexing with no browser-imposed limit.
    // HTTP/1.1 browsers limit concurrent connections per origin (typically 6).
    // We use 5 to leave room for non-dashboard fetches.
    // TODO: Detect HTTP/2+ via Performance API or negotiate header.
    return HTTP1_CONCURRENCY_LIMIT;
}

interface QueryPoolEntry {
    execute: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
}

/**
 *
 */
export function useDashboardQueryPool () {
    const activeCount = useRef(0);
    const queue = useRef<QueryPoolEntry[]>([]);
    const limit = getConcurrentPanelFetchLimit();

    const processQueue = useCallback(() => {
        while (activeCount.current < limit && 0 < queue.current.length) {
            const entry = queue.current.shift();
            if (!entry) {
                break;
            }
            activeCount.current++;
            entry.execute()
                .then((result) => {
                    entry.resolve(result);
                })
                .catch((error: unknown) => {
                    entry.reject(error);
                })
                .finally(() => {
                    activeCount.current--;
                    processQueue();
                });
        }
    }, [limit]);

    const enqueue = useCallback(<T>(execute: () => Promise<T>): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            queue.current.push({
                execute: execute,
                reject: reject,
                resolve: resolve as (value: unknown) => void,
            });
            processQueue();
        });
    }, [processQueue]);

    return {enqueue: enqueue, limit: limit};
}
