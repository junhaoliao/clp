import {
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import useSearchStore from "../../stores/search-store";
// JSX is used in vi.mock factories below
import SearchPage from "./index";


// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock child components so we isolate SearchPage's own rendering logic
vi.mock("./components/SearchControls", () => ({
    SearchControls: () => <div data-testid={"search-controls"}>SearchControls</div>,
}));
vi.mock("./components/PrestoSearchControls", () => ({
    PrestoSearchControls: () => (
        <div data-testid={"presto-search-controls"}>PrestoSearchControls</div>
    ),
}));
vi.mock("./components/QueryStatus", () => ({
    QueryStatus: () => <div data-testid={"query-status"}>QueryStatus</div>,
}));
vi.mock("./components/ResultsTimeline", () => ({
    ResultsTimeline: () => <div data-testid={"results-timeline"}>ResultsTimeline</div>,
}));
vi.mock("./components/ResultsTable", () => ({
    ResultsTable: () => <div data-testid={"results-table"}>ResultsTable</div>,
}));
vi.mock("./components/PrestoResultsTable", () => ({
    PrestoResultsTable: () => (
        <div data-testid={"presto-results-table"}>PrestoResultsTable</div>
    ),
}));

// Mock the metadata hook so SearchPage doesn't try to load settings
vi.mock("../../hooks/use-update-state-with-metadata", () => ({
    useUpdateStateWithMetadata: () => {
    },
}));

vi.mock("@clp/webui-shared", () => ({
    CLP_QUERY_ENGINES: {
        CLP: "clp",
        CLP_S: "clp-s",
        PRESTO: "presto",
    },
}));

// Mutable config value so we can switch between native and Presto per test.
const mockConfig = {
    SETTINGS_QUERY_ENGINE: "clp-s" as string,
};

vi.mock("../../config", () => ({
    /**
     *
     */
    get SETTINGS_QUERY_ENGINE () {
        return mockConfig.SETTINGS_QUERY_ENGINE;
    },
}));

vi.mock("../../stores/search-store", () => ({
    __esModule: true,
    default: vi.fn(),
    SEARCH_UI_STATE: {
        DEFAULT: 0,
        QUERY_ID_PENDING: 1,
        QUERYING: 2,
        DONE: 3,
        FAILED: 4,
    },
    SEARCH_STATE_DEFAULT: {},
}));

// Provide a minimal zustand-like store mock
const mockGetState = vi.fn();
const mockSetState = vi.fn();
const mockSubscribe = vi.fn();
const storeRef: Record<string, unknown> = {};

beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockConfig.SETTINGS_QUERY_ENGINE = "clp-s";
    storeRef.getState = mockGetState;
    storeRef.setState = mockSetState;
    storeRef.subscribe = mockSubscribe;
    (useSearchStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector: (state: Record<string, unknown>) => unknown) => {
            if (selector) {
                return selector({});
            }

            return {};
        },
    );
    Object.assign(useSearchStore as unknown as Record<string, unknown>, storeRef);
});


// ---------------------------------------------------------------------------
// Tests — Native query engine
// ---------------------------------------------------------------------------

describe("SearchPage (native query engine)", () => {
    it("renders SearchControls when engine is not Presto", () => {
        render(<SearchPage/>);
        expect(screen.getByTestId("search-controls")).toBeDefined();
        expect(screen.queryByTestId("presto-search-controls")).toBeNull();
    });

    it("renders ResultsTimeline for native engine", () => {
        render(<SearchPage/>);
        expect(screen.getByTestId("results-timeline")).toBeDefined();
    });

    it("renders ResultsTable (not PrestoResultsTable) for native engine", () => {
        render(<SearchPage/>);
        expect(screen.getByTestId("results-table")).toBeDefined();
        expect(screen.queryByTestId("presto-results-table")).toBeNull();
    });

    it("always renders QueryStatus", () => {
        render(<SearchPage/>);
        expect(screen.getByTestId("query-status")).toBeDefined();
    });
});


// ---------------------------------------------------------------------------
// Tests — Presto query engine
// ---------------------------------------------------------------------------

describe("SearchPage (Presto query engine)", () => {
    beforeEach(() => {
        mockConfig.SETTINGS_QUERY_ENGINE = "presto";
    });

    it("renders PrestoSearchControls when engine is Presto", () => {
        render(<SearchPage/>);
        expect(screen.getByTestId("presto-search-controls")).toBeDefined();
        expect(screen.queryByTestId("search-controls")).toBeNull();
    });

    it("does NOT render ResultsTimeline for Presto engine", () => {
        render(<SearchPage/>);
        expect(screen.queryByTestId("results-timeline")).toBeNull();
    });

    it("renders PrestoResultsTable for Presto engine", () => {
        render(<SearchPage/>);
        expect(screen.getByTestId("presto-results-table")).toBeDefined();
        expect(screen.queryByTestId("results-table")).toBeNull();
    });

    it("still renders QueryStatus for Presto engine", () => {
        render(<SearchPage/>);
        expect(screen.getByTestId("query-status")).toBeDefined();
    });
});
