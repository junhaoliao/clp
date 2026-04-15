import type {
    Collection,
    Document,
} from "mongodb";

import {
    CLIENT_UPDATE_TIMEOUT_MILLIS,
    type ConnectionId,
    type MongoCustomSocket,
    type QueryParameters,
    type Watcher,
} from "./typings.js";
import {convertQueryToChangeStreamFormat} from "./utils.js";


class MongoWatcherCollection {
    #collection: Collection;

    #watchers: Map<string, Watcher> = new Map();

    constructor (collection: Collection) {
        this.#collection = collection;
    }

    createWatcher (
        queryParams: QueryParameters,
        queryId: number,
        emitUpdate: (queryId: number, data: Document[]) => void,
    ): void {
        const queryHash = queryParams.collectionName + JSON.stringify(queryParams);
        if (this.#watchers.has(queryHash)) {
            return;
        }

        const changeStreamQuery = convertQueryToChangeStreamFormat(queryParams.query);
        const changeStream = this.#collection.watch(
            [{$match: changeStreamQuery}],
            {fullDocument: "updateLookup"},
        );

        let lastUpdateTime = 0;
        let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

        const throttledEmit = () => {
            const now = Date.now();
            const timeSinceLastUpdate = now - lastUpdateTime;

            if (timeSinceLastUpdate >= CLIENT_UPDATE_TIMEOUT_MILLIS) {
                lastUpdateTime = now;
                this.#emitCurrentData(queryParams, queryId, emitUpdate).catch(() => {
                });
            } else if (null === pendingTimeout) {
                pendingTimeout = setTimeout(() => {
                    pendingTimeout = null;
                    lastUpdateTime = Date.now();
                    this.#emitCurrentData(queryParams, queryId, emitUpdate).catch(() => {
                    });
                }, CLIENT_UPDATE_TIMEOUT_MILLIS - timeSinceLastUpdate);
            }
        };

        changeStream.on("change", throttledEmit);

        this.#watchers.set(queryHash, {
            changeStream: changeStream,
            subscribers: [],
        });
    }

    async find (queryParameters: QueryParameters): Promise<Document[]> {
        return this.#collection.find(
            queryParameters.query,
            queryParameters.options,
        ).toArray();
    }

    subscribe (queryId: number, socket: MongoCustomSocket): void {
        const entry = [...this.#watchers.values()].find(
            (w) => w.subscribers.includes(socket.id),
        );

        if (entry) {
            entry.subscribers.push(socket.id);
        }
    }

    unsubscribe (queryId: number, connectionId: ConnectionId): boolean {
        for (const [hash, watcher] of this.#watchers) {
            const idx = watcher.subscribers.indexOf(connectionId);
            if (-1 !== idx) {
                watcher.subscribers.splice(idx, 1);
                if (0 === watcher.subscribers.length) {
                    watcher.changeStream.close().catch(() => {
                    });
                    this.#watchers.delete(hash);

                    return true;
                }
            }
        }

        return false;
    }

    hasWatcher (queryId: number): boolean {
        return this.#watchers.has(String(queryId));
    }

    isReferenced (): boolean {
        for (const watcher of this.#watchers.values()) {
            if (0 < watcher.subscribers.length) {
                return true;
            }
        }

        return false;
    }

    async #emitCurrentData (
        queryParams: QueryParameters,
        queryId: number,
        emitUpdate: (queryId: number, data: Document[]) => void,
    ): Promise<void> {
        try {
            const documents = await this.find(queryParams);
            emitUpdate(queryId, documents);
        } catch {
            // Collection might have been dropped
        }
    }
}

export {MongoWatcherCollection};
