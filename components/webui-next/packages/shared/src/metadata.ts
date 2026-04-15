import {CLP_QUERY_ENGINES} from "./config.js";
import {Nullable} from "./utility-types.js";


enum SEARCH_SIGNAL {
    NONE = "none",
    REQ_CANCELLCE = "req-cancelling",
    REQ_CLEARING = "req-clearing",
    REQ_QUERYING = "req-querying",
    RESP_DONE = "resp-done",
    RESP_QUERYING = "resp-querying",
}

enum PRESTO_SEARCH_SIGNAL {
    QUERYING = "QUERYING",
    DONE = "DONE",
    FAILED = "FAILED",
}

interface SearchResultsMetadataDocument {
    _id: string;
    errorMsg: Nullable<string>;
    errorName: Nullable<string>;
    lastSignal: SEARCH_SIGNAL | PRESTO_SEARCH_SIGNAL;
    numTotalResults?: number;
    queryEngine: CLP_QUERY_ENGINES;
}

export {
    PRESTO_SEARCH_SIGNAL,
    SEARCH_SIGNAL,
};
export type {SearchResultsMetadataDocument};
