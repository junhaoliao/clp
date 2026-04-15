import type {Nullable} from "@clp/webui-shared";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@clp/webui-shared/socket";
import {
    io,
    Socket,
} from "socket.io-client";


let sharedSocket: Nullable<Socket<ServerToClientEvents, ClientToServerEvents>> = null;

/**
 * Returns the shared Socket.io instance for the application. Creates a new connection if one
 * doesn't exist yet.
 *
 * @return The shared Socket.io instance.
 */
const getSharedSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
    if (!sharedSocket) {
        // eslint-disable-next-line no-warning-comments
        // TODO: Add support for user provided domain name (i.e. io("https://server-domain.com")).
        sharedSocket = io();
    }

    return sharedSocket;
};

export {getSharedSocket};
