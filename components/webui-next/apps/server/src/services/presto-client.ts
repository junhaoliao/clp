import {
    Client,
    type ClientOptions,
    type Column,
    type PrestoError,
    type RuntimeStats,
} from "presto-client";

import {MAX_PRESTO_SEARCH_RESULTS} from "../routes/presto-search/constants.js";


type PrestoClientConfig = ClientOptions;

class PrestoClient {
    #client: Client;

    constructor (config: PrestoClientConfig) {
        this.#client = new Client(config);
    }

    execute (
        query: string,
        callbacks: {
            onData: (rows: unknown[][], columns: Column[]) => void;
            onError: (error: PrestoError) => void;
            onSuccess: () => void;
            onState: (queryId: string, stats: RuntimeStats) => void;
        },
    ): void {
        let rowCount = 0;

        this.#client.execute({
            query: query,
            data: (error, data, columns) => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (null !== error) {
                    callbacks.onError(error);

                    return;
                }
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (data && 0 < data.length && rowCount < MAX_PRESTO_SEARCH_RESULTS) {
                    const remaining = MAX_PRESTO_SEARCH_RESULTS - rowCount;
                    const sliced = data.slice(0, remaining);
                    rowCount += sliced.length;
                    callbacks.onData(sliced, columns);
                }
            },
            error: (error) => {
                callbacks.onError(error);
            },
            state: (error, queryId, stats) => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (null === error && queryId) {
                    callbacks.onState(queryId, stats);
                }
            },
            success: () => {
                callbacks.onSuccess();
            },
        });
    }

    kill (queryId: string): void {
        this.#client.kill(queryId);
    }
}

export {PrestoClient};
export type {PrestoClientConfig};
