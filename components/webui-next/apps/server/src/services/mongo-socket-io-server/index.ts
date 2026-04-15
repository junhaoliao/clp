import type {
    ClientToServerEvents,
    Response,
    ServerToClientEvents,
} from "@clp/webui-shared/socket";
import type {
    Db,
    Filter,
    FindOptions,
} from "mongodb";
import {Server} from "socket.io";

import {MongoWatcherCollection} from "./mongo-watcher-collection.js";
import type {
    MongoCustomSocket,
    QueryParameters,
} from "./typings.js";
import {
    getQueryHash,
    removeItemFromArray,
} from "./utils.js";


interface SubscribeRequestArgs {
    collectionName: string;
    query: Filter<import("mongodb").Document>;
    options: FindOptions;
}

class MongoSocketIoServer {
    #io: Server<ClientToServerEvents, ServerToClientEvents>;

    #db: Db;

    #collections: Map<string, MongoWatcherCollection> = new Map();

    #queryIdToQueryHashMap: Map<number, string> = new Map();

    #subscribedQueryIdsMap: Map<string, number[]> = new Map();

    #queryIdCounter = 0;

    constructor (io: Server<ClientToServerEvents, ServerToClientEvents>, db: Db) {
        this.#io = io;
        this.#db = db;
        this.#setupSocketHandlers();
    }

    #trackSubscribedQuery (socket: MongoCustomSocket, queryId: number): void {
        const subscribed = this.#subscribedQueryIdsMap.get(socket.id) || [];
        subscribed.push(queryId);
        this.#subscribedQueryIdsMap.set(socket.id, subscribed);
    }

    async #handleSubscribe (
        socket: MongoCustomSocket,
        requestArgs: SubscribeRequestArgs,
        callback: (res: Response<{queryId: number; initialDocuments: object[]}>) => void,
    ): Promise<void> {
        try {
            const {collectionName, options, query} = requestArgs;
            const queryId = ++this.#queryIdCounter;
            const queryParams: QueryParameters = {collectionName, options, query};
            const queryHash = getQueryHash(queryParams);

            this.#queryIdToQueryHashMap.set(queryId, queryHash);

            let watcherCollection = this.#collections.get(collectionName);
            if (!watcherCollection) {
                const mongoCollection = this.#db.collection(collectionName);
                watcherCollection = new MongoWatcherCollection(mongoCollection);
                this.#collections.set(collectionName, watcherCollection);
            }

            // Create watcher for this query
            watcherCollection.createWatcher(
                queryParams,
                queryId,
                (qId, data) => {
                    this.#io.to(String(qId)).emit("collection::find::update", {
                        data: data as object[],
                        queryId: qId,
                    });
                },
            );

            // Subscribe the socket
            watcherCollection.subscribe(queryId, socket);
            await socket.join(String(queryId));

            // Track subscribed queries for this socket
            this.#trackSubscribedQuery(socket, queryId);

            // Get initial documents
            const initialDocuments = await watcherCollection.find(queryParams);
            callback({data: {initialDocuments: initialDocuments as object[], queryId: queryId}});
        } catch (error) {
            const err = error instanceof Error ?
                error :
                new Error(String(error));

            callback({error: err.message});
        }
    }

    #setupSocketHandlers (): void {
        this.#io.on("connection", (socket: MongoCustomSocket) => {
            socket.on("collection::find::subscribe", async (requestArgs, callback) => {
                await this.#handleSubscribe(socket, requestArgs, callback);
            });

            // eslint-disable-next-line @typescript-eslint/require-await
            socket.on("collection::find::unsubscribe", async (requestArgs) => {
                const {queryId} = requestArgs;
                this.#unsubscribeQuery(socket, queryId);
            });

            socket.on("disconnect", () => {
                const queryIds = this.#subscribedQueryIdsMap.get(socket.id);
                if (queryIds) {
                    for (const queryId of queryIds) {
                        this.#unsubscribeQuery(socket, queryId);
                    }
                    this.#subscribedQueryIdsMap.delete(socket.id);
                }
            });
        });
    }

    #unsubscribeQuery (socket: MongoCustomSocket, queryId: number): void {
        const queryHash = this.#queryIdToQueryHashMap.get(queryId);
        if (!queryHash) {
            return;
        }

        const queryParams = JSON.parse(queryHash) as QueryParameters;
        const watcherCollection = this.#collections.get(queryParams.collectionName);
        if (watcherCollection) {
            const wasLast = watcherCollection.unsubscribe(queryId, socket.id);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            socket.leave(String(queryId));

            if (wasLast && !watcherCollection.isReferenced()) {
                this.#collections.delete(queryParams.collectionName);
            }
        }

        this.#queryIdToQueryHashMap.delete(queryId);

        const subscribed = this.#subscribedQueryIdsMap.get(socket.id);
        if (subscribed) {
            removeItemFromArray(subscribed, queryId);
        }
    }
}

/**
 *
 * @param server
 * @param db
 */
function initMongoSocketIoServer (
    server: import("http").Server,
    db: Db,
): MongoSocketIoServer {
    const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
        cors: {origin: "*"},
    });

    return new MongoSocketIoServer(io, db);
}

export {
    initMongoSocketIoServer, MongoSocketIoServer,
};
