type QueryId = number;

interface Err {
    error: string;
    queryId?: QueryId;
}

interface Success<T> {
    data: T;
}

type Response<T> = Err | Success<T>;

type ClientToServerEvents = {
    "disconnect": () => void;
    "collection::find::subscribe": (
        requestArgs: {
            collectionName: string;
            query: object;
            options: object;
        },
        callback: (res: Response<{queryId: QueryId; initialDocuments: object[]}>) => void,
    ) => void;
    "collection::find::unsubscribe": (
        requestArgs: {
            queryId: QueryId;
        },
    ) => Promise<void>;
};

interface ServerToClientEvents {
    "collection::find::update": (respArgs: {
        queryId: QueryId;
        data: object[];
    }) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface InterServerEvents {
}

interface SocketData {
    collectionName?: string;
}

export type {
    ClientToServerEvents,
    Err,
    InterServerEvents,
    QueryId,
    Response,
    ServerToClientEvents,
    SocketData,
};
