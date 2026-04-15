import type {SearchResultsMetadataDocument} from "@clp/webui-shared";
import {SEARCH_SIGNAL} from "@clp/webui-shared";
import {
    renderHook,
    waitFor,
} from "@testing-library/react";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";


// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUpdateNumSearchResultsMetadata = vi.fn();
const mockUpdateSearchUiState = vi.fn();

// Mutable ref so tests can control what useResultsMetadata returns
const mockResultsMetadataRef: {current: SearchResultsMetadataDocument | null} = {
    current: null,
};

// Mutable searchUiState so tests can control what getState returns
let mockSearchUiState = 2; // QUERYING by default

const mockUseSearchStore = vi.fn(() => ({
    updateNumSearchResultsMetadata: mockUpdateNumSearchResultsMetadata,
    updateSearchUiState: mockUpdateSearchUiState,
}));

(mockUseSearchStore as any).getState = () => ({
    searchUiState: mockSearchUiState,
});

vi.mock("../stores/search-store", () => ({
    __esModule: true,
    default: mockUseSearchStore,
    SEARCH_UI_STATE: {
        DEFAULT: 0,
        QUERY_ID_PENDING: 1,
        QUERYING: 2,
        DONE: 3,
        FAILED: 4,
    },
}));

vi.mock("./use-results-metadata", () => ({
    useResultsMetadata: () => mockResultsMetadataRef.current,
}));

// Mock SEARCH_SIGNAL from @clp/webui-shared so the hook's switch-case works
vi.mock("@clp/webui-shared", () => ({
    SEARCH_SIGNAL: {
        NONE: "none",
        REQ_CANCELLCE: "req-cancelling",
        REQ_CLEARING: "req-clearing",
        REQ_QUERYING: "req-querying",
        RESP_DONE: "resp-done",
        RESP_QUERYING: "resp-querying",
    },
}));


// Import after mocks are set up
const {useUpdateStateWithMetadata} = await import(
    "./use-update-state-with-metadata"
);


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useUpdateStateWithMetadata", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockResultsMetadataRef.current = null;
        mockSearchUiState = 2; // QUERYING
    });

    it("does nothing when resultsMetadata is null", () => {
        mockResultsMetadataRef.current = null;

        renderHook(() => {
            useUpdateStateWithMetadata();
        });

        expect(mockUpdateSearchUiState).not.toHaveBeenCalled();
        expect(mockUpdateNumSearchResultsMetadata).not.toHaveBeenCalled();
    });

    it("does nothing when searchUiState is DEFAULT", () => {
        mockSearchUiState = 0; // DEFAULT
        mockResultsMetadataRef.current = {
            _id: "42",
            errorMsg: null,
            errorName: null,
            lastSignal: SEARCH_SIGNAL.RESP_DONE,
            numTotalResults: 100,
            queryEngine: "clp-s" as any,
        };

        renderHook(() => {
            useUpdateStateWithMetadata();
        });

        expect(mockUpdateSearchUiState).not.toHaveBeenCalled();
        expect(mockUpdateNumSearchResultsMetadata).not.toHaveBeenCalled();
    });

    it("updates numSearchResultsMetadata when numTotalResults is defined", async () => {
        mockResultsMetadataRef.current = {
            _id: "42",
            errorMsg: null,
            errorName: null,
            lastSignal: SEARCH_SIGNAL.RESP_QUERYING,
            numTotalResults: 50,
            queryEngine: "clp-s" as any,
        };

        renderHook(() => {
            useUpdateStateWithMetadata();
        });

        await waitFor(() => {
            expect(mockUpdateNumSearchResultsMetadata).toHaveBeenCalledWith(50);
        });
    });

    it("does NOT update numSearchResultsMetadata when numTotalResults is undefined", () => {
        mockResultsMetadataRef.current = {
            _id: "42",
            errorMsg: null,
            errorName: null,
            lastSignal: SEARCH_SIGNAL.RESP_QUERYING,
            queryEngine: "clp-s" as any,
        };

        renderHook(() => {
            useUpdateStateWithMetadata();
        });

        expect(mockUpdateNumSearchResultsMetadata).not.toHaveBeenCalled();
    });

    it("sets DONE state when lastSignal is SEARCH_SIGNAL.RESP_DONE", async () => {
        mockResultsMetadataRef.current = {
            _id: "42",
            errorMsg: null,
            errorName: null,
            lastSignal: SEARCH_SIGNAL.RESP_DONE,
            numTotalResults: 100,
            queryEngine: "clp-s" as any,
        };

        renderHook(() => {
            useUpdateStateWithMetadata();
        });

        await waitFor(() => {
            expect(mockUpdateSearchUiState).toHaveBeenCalledWith(3); // DONE
        });

        expect(mockUpdateNumSearchResultsMetadata).toHaveBeenCalledWith(100);
    });

    it("does not change state when lastSignal is not RESP_DONE", () => {
        mockResultsMetadataRef.current = {
            _id: "42",
            errorMsg: null,
            errorName: null,
            lastSignal: SEARCH_SIGNAL.RESP_QUERYING,
            numTotalResults: 10,
            queryEngine: "clp-s" as any,
        };

        renderHook(() => {
            useUpdateStateWithMetadata();
        });

        // numTotalResults should still be updated since it's defined
        expect(mockUpdateNumSearchResultsMetadata).toHaveBeenCalledWith(10);
        // But the UI state should NOT transition to DONE
        expect(mockUpdateSearchUiState).not.toHaveBeenCalled();
    });
});
