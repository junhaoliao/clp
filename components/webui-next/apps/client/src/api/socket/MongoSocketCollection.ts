import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@clp/webui-shared/socket";
import type {Socket} from "socket.io-client";

import {MongoSocketCursor} from "./MongoSocketCursor.js";
import {getSharedSocket} from "./SocketSingleton.js";


/**
 * Socket connection to a MongoDB collection residing on a server. Class provides methods to
 * query the collection.
 */
class MongoSocketCollection {
    #collectionName: string;

    #socket: Socket<ServerToClientEvents, ClientToServerEvents>;

    /**
     * Initializes socket connection to a MongoDB collection on the server.
     *
     * @param collectionName
     */
    constructor (collectionName: string) {
        this.#socket = getSharedSocket();
        this.#collectionName = collectionName;
    }

    /**
     * Selects documents in collection and returns a cursor-like object.
     *
     * @param query
     * @param options
     * @return a `MongoSocketCursor`.
     */

    find (query: object, options: object) {
        return new MongoSocketCursor(
            this.#socket,
            this.#collectionName,
            query,
            options,
        );
    }
}


export default MongoSocketCollection;
