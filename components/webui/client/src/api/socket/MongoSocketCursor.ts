import {
    ClientToServerEvents,
    QueryId,
    Response,
    ServerToClientEvents,
} from "@webui/common/socket";
import {Nullable} from "@webui/common/utility-types";
import {Socket} from "socket.io-client";


/**
 * A cursor-like object receiving MongoDB documents over a socket connection.
 */
class MongoSocketCursor {
    #socket: Socket<ServerToClientEvents, ClientToServerEvents>;

    #collectionName: string;

    #query: object;

    #options: object;

    #queryId: Nullable<QueryId> = null;


    // Listener for data updates from the server.
    #updateListener: Nullable<(respArgs: {queryId: number; data: object[]}) => void> = null;

    /**
     * @param socket
     * @param collectionName
     * @param query
     * @param options
     */
    constructor (
        socket: Socket<ServerToClientEvents, ClientToServerEvents>,
        collectionName: string,
        query: object,
        options: object
    ) {
        this.#socket = socket;
        this.#collectionName = collectionName;
        this.#query = query;
        this.#options = options;
    }

    /**
     * Subscribes to query watcher for real-time updates.
     *
     * @param onDataUpdate Handler which sets data updates from the server in react ui component.
     * @throws {Error} if subscription fails.
     */
    async subscribe (onDataUpdate: (data: object[]) => void): Promise<void> {
        console.debug(
            `Subscribing to query: ${JSON.stringify(this.#query)} ` +
            `with options:${JSON.stringify(this.#options)} ` +
            `on collection:${this.#collectionName}`
        );

        // Buffer updates received before the queryId is known, since the server may emit
        // change-stream updates between creating the watcher and sending the ack response.
        let pendingUpdates: {queryId: number; data: object[]}[] | null = [];

        this.#updateListener = (respArgs: {queryId: number; data: object[]}) => {
            if (null !== pendingUpdates) {
                pendingUpdates.push(respArgs);

                return;
            }

            // Server sends updates for multiple queryIDs using the same event name.
            if (this.#queryId === respArgs.queryId) {
                onDataUpdate(respArgs.data);
            }
        };

        this.#socket.on("collection::find::update", this.#updateListener);

        const response: Response<{queryId: number; initialDocuments: object[]}> =
            await this.#socket.emitWithAck(
                "collection::find::subscribe",
                {
                    collectionName: this.#collectionName,
                    query: this.#query,
                    options: this.#options,
                }
            );

        if ("error" in response) {
            this.#socket.off("collection::find::update", this.#updateListener);
            pendingUpdates = null;
            throw new Error(`Subscription failed: ${response.error}`);
        }

        this.#queryId = response.data.queryId;

        // Apply the initial documents, then replay any buffered updates that arrived during
        // the subscription handshake so the client has the latest data.
        onDataUpdate(response.data.initialDocuments);
        for (const update of pendingUpdates) {
            if (this.#queryId === update.queryId) {
                onDataUpdate(update.data);
            }
        }
        pendingUpdates = null;

        console.debug(
            `Successfully subscribed to query: ${JSON.stringify(this.#query)} ` +
            `with options:${JSON.stringify(this.#options)} ` +
            `on collection:${this.#collectionName} ` +
            `MongoSocketIoQueryID:${this.#queryId}`
        );
    }

    /**
     * Requests more results by increasing the query limit. The server will re-query with the new
     * limit and emit an update through the existing subscription.
     *
     * @param newLimit
     */
    loadMore (newLimit: number): void {
        if (null === this.#queryId) {
            console.error("Cannot loadMore: no active subscription");

            return;
        }

        this.#socket.emit("collection::find::loadMore", {
            queryId: this.#queryId,
            newLimit,
        });
    }

    /**
     * Unsubscribe from the query.
     */
    unsubscribe (): void {
        if (null === this.#queryId) {
            console.error("Attempted to unsubscribe, but no active subscription exists.");

            return;
        }


        this.#socket.emit("collection::find::unsubscribe", {
            queryId: this.#queryId,
        });

        if (this.#updateListener) {
            this.#socket.off("collection::find::update", this.#updateListener);
            this.#updateListener = null;
        }

        console.debug(`Unsubscribed from MongoSocketIoQueryID:${this.#queryId}.`);

        this.#queryId = null;
    }
}

export {MongoSocketCursor};
