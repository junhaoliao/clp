import type {Nullable} from "@clp/webui-shared";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@clp/webui-shared/socket";


/**
 * Socket.IO event type definitions re-exported for convenience.
 */
type SocketClient = import("socket.io-client").Socket<ServerToClientEvents, ClientToServerEvents>;


export type {SocketClient};
export type {Nullable};
