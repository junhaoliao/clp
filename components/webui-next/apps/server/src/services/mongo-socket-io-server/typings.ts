import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData,
} from "@clp/webui-shared/socket";
import type {
    ChangeStream,
    Document,
    Filter,
    FindOptions,
} from "mongodb";
import type {Socket} from "socket.io";


type MongoCustomSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
>;

type ConnectionId = string;

interface QueryParameters {
    collectionName: string;
    query: Filter<Document>;
    options: FindOptions;
}

interface DbOptions {
    database: string;
    host: string;
    port: number;
}

interface Watcher {
    changeStream: ChangeStream;
    subscribers: ConnectionId[];
}

const CLIENT_UPDATE_TIMEOUT_MILLIS = 500;

export type {
    ConnectionId,
    DbOptions,
    MongoCustomSocket,
    QueryParameters,
    Watcher,
};
export {CLIENT_UPDATE_TIMEOUT_MILLIS};
