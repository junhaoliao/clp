import {
    describe,
    expect,
    test,
} from "vitest";

import {CLP_QUERY_ENGINES} from "./config.js";
import type {SearchResultsMetadataDocument} from "./metadata.js";
import {
    PRESTO_SEARCH_SIGNAL,
    SEARCH_SIGNAL,
} from "./metadata.js";


describe("SEARCH_SIGNAL", () => {
    test("has expected signal values", () => {
        expect(SEARCH_SIGNAL.NONE).toBe("none");
        expect(SEARCH_SIGNAL.REQ_CANCELLCE).toBe("req-cancelling");
        expect(SEARCH_SIGNAL.REQ_CLEARING).toBe("req-clearing");
        expect(SEARCH_SIGNAL.REQ_QUERYING).toBe("req-querying");
        expect(SEARCH_SIGNAL.RESP_DONE).toBe("resp-done");
        expect(SEARCH_SIGNAL.RESP_QUERYING).toBe("resp-querying");
    });
});

describe("PRESTO_SEARCH_SIGNAL", () => {
    test("has expected signal values", () => {
        expect(PRESTO_SEARCH_SIGNAL.QUERYING).toBe("QUERYING");
        expect(PRESTO_SEARCH_SIGNAL.DONE).toBe("DONE");
        expect(PRESTO_SEARCH_SIGNAL.FAILED).toBe("FAILED");
    });
});

describe("SearchResultsMetadataDocument", () => {
    test("can be constructed with SEARCH_SIGNAL", () => {
        const doc: SearchResultsMetadataDocument = {
            _id: "test-id",
            errorMsg: null,
            errorName: null,
            lastSignal: SEARCH_SIGNAL.RESP_DONE,
            numTotalResults: 100,
            queryEngine: CLP_QUERY_ENGINES.CLP_S,
        };

        expect(doc.lastSignal).toBe(SEARCH_SIGNAL.RESP_DONE);
        expect(doc.numTotalResults).toBe(100);
    });

    test("can be constructed with PRESTO_SEARCH_SIGNAL", () => {
        const doc: SearchResultsMetadataDocument = {
            _id: "presto-id",
            errorMsg: "Connection refused",
            errorName: "PrestoError",
            lastSignal: PRESTO_SEARCH_SIGNAL.FAILED,
            queryEngine: CLP_QUERY_ENGINES.PRESTO,
        };

        expect(doc.lastSignal).toBe(PRESTO_SEARCH_SIGNAL.FAILED);
        expect(doc.numTotalResults).toBeUndefined();
    });
});
