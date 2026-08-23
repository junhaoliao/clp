import tap, {type Test} from "tap";


const SEARCH_JOB_ID = "101";
const AGGREGATION_JOB_ID = "202";
const NEXT_SEARCH_JOB_ID = "303";
const NEXT_AGGREGATION_JOB_ID = "404";

/** Search UI states used by the mocked store. */
const SEARCH_UI_STATE = Object.freeze({
    DEFAULT: "default",
    DONE: "done",
    FAILED: "failed",
    QUERY_ID_PENDING: "query-id-pending",
    QUERYING: "querying",
});

type SearchUiState = typeof SEARCH_UI_STATE[keyof typeof SEARCH_UI_STATE];

interface StoreState {
    aggregationJobId: string | null;
    searchJobId: string | null;
    searchUiState: SearchUiState;
    startNativeQuery: (searchJobId: string, aggregationJobId: string) => void;
    updateSearchUiState: (state: SearchUiState) => void;
}

interface Deferred {
    promise: Promise<void>;
    reject: (reason: Error) => void;
    resolve: () => void;
}

interface StreamErrorHandler {
    (
        error: {jobId: string; stream: "aggregation" | "search"},
        cancel?: (jobId: number) => Promise<void>
    ): Promise<void>;
}

/**
 * Creates a promise whose settlement can be controlled by a test.
 *
 * @return A deferred promise and its settlement callbacks.
 */
const createDeferred = (): Deferred => {
    const unsetSettlement = (): never => {
        throw new Error("Deferred promise settlement was not initialized");
    };
    let reject: Deferred["reject"] = unsetSettlement;
    let resolve: Deferred["resolve"] = unsetSettlement;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        reject = rejectPromise;
        resolve = resolvePromise;
    });

    return {promise, reject, resolve};
};

/**
 * Gets a deferred promise at a known test index.
 *
 * @param deferreds
 * @param index
 * @return The deferred promise at the requested index.
 * @throws {Error} If the requested index does not exist.
 */
const getDeferred = (deferreds: Deferred[], index: number): Deferred => {
    const deferred = deferreds[index];
    if (deferred) {
        return deferred;
    }

    throw new Error(`Missing deferred promise at index ${index}`);
};

const store: StoreState = {
    aggregationJobId: null,
    searchJobId: null,
    searchUiState: SEARCH_UI_STATE.DEFAULT,
    startNativeQuery: (searchJobId, aggregationJobId) => {
        store.aggregationJobId = aggregationJobId;
        store.searchJobId = searchJobId;
        store.searchUiState = SEARCH_UI_STATE.QUERYING;
    },
    updateSearchUiState: (state) => {
        store.searchUiState = state;
    },
};
const useSearchStore = {getState: () => store};
const {handleNativeQueryStreamError} = await tap.mockImport<{
    handleNativeQueryStreamError: StreamErrorHandler;
}>("./search-requests.ts", {
    /* eslint-disable sort-keys */
    "@webui/common/config": {CLP_STORAGE_ENGINES: {CLP: "clp"}},
    "@webui/common/schemas/search": {},
    "antd": {message: {error: () => null}},
    "../../../../api/search": {
        cancelQuery: () => Promise.resolve(),
        submitQuery: () => Promise.resolve(Number(SEARCH_JOB_ID)),
    },
    "../../../../config": {SETTINGS_STORAGE_ENGINE: "clp"},
    "../../SearchState": {
        default: useSearchStore,
        SEARCH_STATE_DEFAULT: {
            numSearchResultsMetadata: 0,
            numSearchResultsTable: 0,
            numSearchResultsTimeline: 0,
        },
    },
    "../../SearchState/typings": {SEARCH_UI_STATE},
    "./utils": {unquoteString: (value: string) => value},
    /* eslint-enable sort-keys */
});

/** Starts the standard job pair used by each test. */
const startQuery = (): void => {
    store.startNativeQuery(SEARCH_JOB_ID, AGGREGATION_JOB_ID);
};

/**
 * Verifies cleanup behavior for one of the two native query streams.
 *
 * @param test
 * @param stream
 * @param jobId
 * @return A promise that settles when the assertions complete.
 */
const testStreamFailure = async (
    test: Test,
    stream: "aggregation" | "search",
    jobId: string
): Promise<void> => {
    startQuery();
    const cancellations = [createDeferred(),
        createDeferred()];
    const cancelledJobIds: number[] = [];
    const cleanup = handleNativeQueryStreamError({jobId, stream}, (cancelledJobId) => {
        cancelledJobIds.push(cancelledJobId);

        return getDeferred(cancellations, cancelledJobIds.length - 1).promise;
    });

    test.same(cancelledJobIds, [Number(SEARCH_JOB_ID),
        Number(AGGREGATION_JOB_ID)]);
    test.equal(store.searchUiState, SEARCH_UI_STATE.QUERYING);
    cancellations.forEach(({resolve}) => {
        resolve();
    });
    await cleanup;
    test.equal(store.searchUiState, SEARCH_UI_STATE.FAILED);
};

await tap.test("search stream failure cancels both jobs", async (test: Test) => {
    await testStreamFailure(test, "search", SEARCH_JOB_ID);
});

await tap.test("aggregation stream failure cancels both jobs", async (test: Test) => {
    await testStreamFailure(test, "aggregation", AGGREGATION_JOB_ID);
});

await tap.test("stale stream failure leaves the active query unchanged", async (test: Test) => {
    startQuery();
    const cancelledJobIds: number[] = [];

    await handleNativeQueryStreamError(
        {jobId: NEXT_SEARCH_JOB_ID, stream: "search"},
        (jobId) => {
            cancelledJobIds.push(jobId);

            return Promise.resolve();
        }
    );

    test.same(cancelledJobIds, []);
    test.equal(store.searchUiState, SEARCH_UI_STATE.QUERYING);
});

await tap.test("manual cancellation is not overwritten", async (test: Test) => {
    startQuery();
    const cancellations = [createDeferred(),
        createDeferred()];
    let cancellationIndex = 0;
    const cleanup = handleNativeQueryStreamError(
        {jobId: SEARCH_JOB_ID, stream: "search"},
        () => getDeferred(cancellations, cancellationIndex++).promise
    );

    store.updateSearchUiState(SEARCH_UI_STATE.DONE);
    cancellations.forEach(({resolve}) => {
        resolve();
    });
    await cleanup;

    test.equal(store.searchUiState, SEARCH_UI_STATE.DONE);
});

await tap.test("one failed cancellation does not prevent cleanup", async (test: Test) => {
    startQuery();
    const cancelledJobIds: number[] = [];

    await handleNativeQueryStreamError(
        {jobId: SEARCH_JOB_ID, stream: "search"},
        (jobId) => {
            cancelledJobIds.push(jobId);

            return jobId === Number(SEARCH_JOB_ID) ?
                Promise.reject(new Error("expected cancellation failure")) :
                Promise.resolve();
        }
    );

    test.same(cancelledJobIds, [Number(SEARCH_JOB_ID),
        Number(AGGREGATION_JOB_ID)]);
    test.equal(store.searchUiState, SEARCH_UI_STATE.FAILED);
});

await tap.test("simultaneous failures share one cleanup", async (test: Test) => {
    startQuery();
    const cancellation = createDeferred();
    const cancelledJobIds: number[] = [];
    const cancel = (jobId: number): Promise<void> => {
        cancelledJobIds.push(jobId);

        return cancellation.promise;
    };
    const searchCleanup = handleNativeQueryStreamError(
        {jobId: SEARCH_JOB_ID, stream: "search"},
        cancel
    );
    const aggregationCleanup = handleNativeQueryStreamError(
        {jobId: AGGREGATION_JOB_ID, stream: "aggregation"},
        cancel
    );

    test.same(cancelledJobIds, [Number(SEARCH_JOB_ID),
        Number(AGGREGATION_JOB_ID)]);
    cancellation.resolve();
    await Promise.all([searchCleanup,
        aggregationCleanup]);

    test.equal(store.searchUiState, SEARCH_UI_STATE.FAILED);
});

await tap.test("old cleanup cannot fail a newer query", async (test: Test) => {
    startQuery();
    const cancellation = createDeferred();
    const cleanup = handleNativeQueryStreamError(
        {jobId: SEARCH_JOB_ID, stream: "search"},
        () => cancellation.promise
    );

    store.startNativeQuery(NEXT_SEARCH_JOB_ID, NEXT_AGGREGATION_JOB_ID);
    cancellation.resolve();
    await cleanup;

    test.equal(store.searchJobId, NEXT_SEARCH_JOB_ID);
    test.equal(store.aggregationJobId, NEXT_AGGREGATION_JOB_ID);
    test.equal(store.searchUiState, SEARCH_UI_STATE.QUERYING);
});
