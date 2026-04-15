import {
    act,
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";


dayjs.extend(utc);

import useSearchStore, {
    SEARCH_STATE_DEFAULT,
    SEARCH_UI_STATE,
} from "../../../stores/search-store";
import {ResultsTable} from "./ResultsTable";


// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useCursor to return data we control
const mockUseCursor = vi.fn();
vi.mock("../../../hooks/use-cursor", () => ({
    useCursor: (...args: unknown[]) => mockUseCursor(...args),
}));

// Mock MongoSocketCollection
// Use a named function so it can be invoked with `new` in the useCursor factory.
const mockMongoSocketCollectionFind = vi.fn();
vi.mock("../../../api/socket/MongoSocketCollection", () => ({
    __esModule: true,

    default: vi.fn(function MockMongoSocketCollection (this: unknown) {
        this.find = mockMongoSocketCollectionFind;
    }),
}));

// Mock DashboardCard
vi.mock("../../../components/dashboard/DashboardCard", () => ({
    DashboardCard: ({
        title,
        children,
    }: {
        title: string;
        children?: React.ReactNode;
    }) => (
        <div data-testid={"dashboard-card"}>
            <div data-testid={"dashboard-card-title"}>
                {title}
            </div>
            {children}
        </div>
    ),
}));

// Mock config
vi.mock("../../../config", () => ({
    STREAM_TYPE: "json",
    SETTINGS_QUERY_ENGINE: "clp-s",
    SETTINGS_STORAGE_ENGINE: "clp-s",
    SETTINGS_LOGS_INPUT_TYPE: "fs",
    SETTINGS_MAX_DATASETS_PER_QUERY: 100,
}));

// Mock react-router Link
vi.mock("react-router", () => ({
    Link: ({
        children,
        to,
    }: {
        children: React.ReactNode;
        to: string;
    }) => (
        <a href={to}>
            {children}
        </a>
    ),
}));

// Mock @tanstack/react-virtual
const mockGetVirtualItems = vi.fn();
const mockGetTotalSize = vi.fn();

// Module-level variable to capture the virtualizer options (including measureElement)
// from each useVirtualizer call so tests can inspect them.
let capturedVirtualizerOptions: Record<string, unknown> = {};

vi.mock("@tanstack/react-virtual", () => ({
    useVirtualizer: (options: Record<string, unknown>) => {
        capturedVirtualizerOptions = options;

        return {
            getVirtualItems: mockGetVirtualItems,
            getTotalSize: mockGetTotalSize,
            measureElement: vi.fn(),

            // Expose options so we can assert count
            options,
        };
    },
}));

// Mock react-syntax-highlighter
vi.mock("react-syntax-highlighter", () => ({
    __esModule: true,
    default: ({
        children,
        language,
    }: {
        children: string;
        language: string;
    }) => (
        <pre data-language={language}>
            <code>
                {children}
            </code>
        </pre>
    ),
}));

vi.mock("react-syntax-highlighter/dist/esm/styles/hljs", () => ({
    tomorrow: {},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = Date.now();

interface SearchResult {
    _id: string;
    archive_id?: string;
    dataset?: string;
    filePath?: string;
    log_event_ix?: number;
    message: string;
    orig_file_id?: string;
    orig_file_path?: string;
    stream_id?: string;
    timestamp: number;
}

/**
 *
 * @param id
 * @param timestamp
 * @param message
 * @param extras
 */
const makeResult = (
    id: string,
    timestamp: number,
    message: string,
    extras?: Partial<SearchResult>,
): SearchResult => ({
    _id: id,
    timestamp,
    message,
    ...extras,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ResultsTable", () => {
    beforeEach(() => {
        cleanup();
        mockUseCursor.mockReturnValue(null);
        mockGetVirtualItems.mockReturnValue([]);
        mockGetTotalSize.mockReturnValue(0);
        capturedVirtualizerOptions = {};
        act(() => {
            useSearchStore.setState({...SEARCH_STATE_DEFAULT});
        });
    });

    afterEach(() => {
        cleanup();
    });

    // ----- Empty / loading states -----

    it("shows loading message when querying and no data yet", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(null);
        render(<ResultsTable/>);
        expect(screen.getByText("Loading results...")).toBeDefined();
    });

    it("shows loading message when QUERY_ID_PENDING and no data", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERY_ID_PENDING,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(null);
        render(<ResultsTable/>);
        expect(screen.getByText("Loading results...")).toBeDefined();
    });

    it("shows 'No results available' when data is null and not querying", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DEFAULT,
                searchJobId: null,
            });
        });
        mockUseCursor.mockReturnValue(null);
        render(<ResultsTable/>);
        expect(screen.getByText("No results available.")).toBeDefined();
    });

    it("shows 'No results available' when data is an empty array", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue([]);
        render(<ResultsTable/>);
        expect(screen.getByText("No results available.")).toBeDefined();
    });

    // ----- Populated state -----

    it("renders result count text", () => {
        const results = [
            makeResult("r1", NOW, "message 1"),
            makeResult("r2", NOW + 1000, "message 2"),
        ];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(72);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
            {index: 1, size: 36, start: 36, key: "r2"},
        ]);
        render(<ResultsTable/>);

        expect(screen.getByText("2 results")).toBeDefined();
    });

    it("renders table headers", () => {
        const results = [makeResult("r1", NOW, "msg")];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);
        render(<ResultsTable/>);

        expect(screen.getByText("Timestamp")).toBeDefined();
        expect(screen.getByText("Message")).toBeDefined();
    });

    it("renders message content for each virtualized row", () => {
        const results = [
            makeResult("r1", NOW, "Hello world"),
            makeResult("r2", NOW + 1000, "Error occurred"),
        ];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(72);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
            {index: 1, size: 36, start: 36, key: "r2"},
        ]);
        render(<ResultsTable/>);

        expect(screen.getByText("Hello world")).toBeDefined();
        expect(screen.getByText("Error occurred")).toBeDefined();
    });

    it("renders Original file link when archive_id and log_event_ix are present", () => {
        const results = [
            makeResult("r1", NOW, "test message", {
                archive_id: "archive-1",
                log_event_ix: 5,
            }),
        ];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);
        render(<ResultsTable/>);

        const fileLink = screen.getByRole("link", {name: /original file/i});
        expect(fileLink).toBeDefined();
        expect(fileLink.href).toContain("streamFile");
        expect(fileLink.href).toContain("streamId=archive-1");
        expect(fileLink.href).toContain("logEventIdx=5");
    });

    it("renders Original file link with dataset when dataset is provided", () => {
        const results = [
            makeResult("r1", NOW, "test message", {
                archive_id: "archive-1",
                log_event_ix: 5,
                dataset: "my-dataset",
            }),
        ];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);
        render(<ResultsTable/>);

        const fileLink = screen.getByRole("link", {name: /original file/i});
        expect(fileLink).toBeDefined();
        expect(fileLink.href).toContain("dataset=my-dataset");
    });

    it("does NOT render Original file link when archive_id is missing", () => {
        const results = [
            makeResult("r1", NOW, "no stream", {
                log_event_ix: 5,
            }),
        ];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);
        render(<ResultsTable/>);

        expect(screen.queryByRole("link", {name: /original file/i})).toBeNull();
    });

    it("does NOT render View link when log_event_ix is missing", () => {
        const results = [
            makeResult("r1", NOW, "no log event", {
                stream_id: "stream-1",
            }),
        ];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);
        render(<ResultsTable/>);

        expect(screen.queryByText("View")).toBeNull();
    });

    it("does NOT render View link when log_event_ix is undefined", () => {
        const results = [
            makeResult("r1", NOW, "undefined log event ix", {
                stream_id: "stream-1",
                log_event_ix: undefined,
            }),
        ];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);
        render(<ResultsTable/>);

        expect(screen.queryByText("View")).toBeNull();
    });

    it("renders DashboardCard with title 'Search Results'", () => {
        mockUseCursor.mockReturnValue(null);
        render(<ResultsTable/>);
        expect(screen.getByText("Search Results")).toBeDefined();
    });

    it("does not show loading when querying but data has already arrived", () => {
        const results = [makeResult("r1", NOW, "msg")];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);
        render(<ResultsTable/>);

        // Data present — table should be rendered, not the loading message
        expect(screen.queryByText("Loading results...")).toBeNull();
        expect(screen.getByText("1 results")).toBeDefined();
    });

    it("calls updateNumSearchResultsTable with the result count via useEffect", () => {
        const results = [
            makeResult("r1", NOW, "msg1"),
            makeResult("r2", NOW + 1000, "msg2"),
            makeResult("r3", NOW + 2000, "msg3"),
        ];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
                numSearchResultsTable: 0,
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(108);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
            {index: 1, size: 36, start: 36, key: "r2"},
            {index: 2, size: 36, start: 72, key: "r3"},
        ]);
        render(<ResultsTable/>);

        // The store should have been updated with 3 results
        expect(useSearchStore.getState().numSearchResultsTable).toBe(3);
    });

    it("formats timestamps in YYYY-MMM-DD HH:mm:ss format", () => {
        // Use a fixed timestamp where we know the formatted output
        const ts = 1679881935000; // 2023-Mar-27 00:32:15 UTC
        const results = [makeResult("r1", ts, "msg")];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);
        const {container} = render(<ResultsTable/>);

        // The timestamp should be formatted as "YYYY-MMM-DD HH:mm:ss" using dayjs.utc()
        const formatted = dayjs.utc(ts).format("YYYY-MMM-DD HH:mm:ss");
        expect(container.textContent).toContain(formatted);
    });

    it("handles null result for an out-of-bounds virtual item gracefully", () => {
        const results = [makeResult("r1", NOW, "msg")];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);

        // Return a virtual item with an out-of-bounds index
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
            {index: 5, size: 36, start: 36, key: "virtual-missing"},
        ]);

        // Should not throw — just skip the null result
        const {container} = render(<ResultsTable/>);
        expect(container).toBeDefined();
    });

    it("renders messages with syntax highlighting in CLP-S mode", () => {
        const results = [
            makeResult("r1", NOW, '{"timestamp":"2023-01-01","level":"info"}', {
                archive_id: "arc-1",
                log_event_ix: 0,
                dataset: "default",
            }),
        ];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);

        const {container} = render(<ResultsTable/>);

        // Syntax highlighter mock renders a pre with data-language
        const allPres = container.querySelectorAll("pre");
        expect(allPres.length).toBeGreaterThanOrEqual(1);
        const preElement = allPres[0];
        expect(preElement?.getAttribute("data-language")).toBe("json");
    });

    // ----- useCursor factory function coverage -----

    it("useCursor factory returns null when searchJobId is null", () => {
        vi.clearAllMocks();
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DEFAULT,
                searchJobId: null,
            });
        });
        mockUseCursor.mockReturnValue(null);
        render(<ResultsTable/>);

        // Capture the factory function passed to useCursor and execute it
        const {calls} = mockUseCursor.mock;
        const factory = calls[calls.length - 1][0] as () => unknown;
        expect(factory()).toBeNull();
    });

    it("useCursor factory creates MongoSocketCollection and calls find with correct options", async () => {
        // Dynamic import to get the mocked constructor
        const {default: MongoSocketCollection} = await import(
            "../../../api/socket/MongoSocketCollection"
        );

        vi.clearAllMocks();
        const mockFindResult = {mockCursor: true};
        mockMongoSocketCollectionFind.mockReturnValue(mockFindResult);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "test-job-42",
            });
        });
        mockUseCursor.mockReturnValue(null);
        render(<ResultsTable/>);

        // Capture the factory function passed to useCursor and execute it
        const {calls} = mockUseCursor.mock;
        const factory = calls[calls.length - 1][0] as () => unknown;
        const result = factory();

        expect(MongoSocketCollection).toHaveBeenCalledWith("test-job-42");
        expect(mockMongoSocketCollectionFind).toHaveBeenCalledWith({}, {
            sort: {timestamp: -1, _id: -1},
            limit: 1000,
        });
        expect(result).toBe(mockFindResult);
    });

    // ----- useVirtualizer measureElement coverage -----

    it("measureElement returns the element's bounding client rect height", () => {
        const results = [makeResult("r1", NOW, "msg")];

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });
        mockUseCursor.mockReturnValue(results);
        mockGetTotalSize.mockReturnValue(36);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, size: 36, start: 0, key: "r1"},
        ]);
        render(<ResultsTable/>);

        // Extract the measureElement callback that was passed to useVirtualizer
        const measureElement = capturedVirtualizerOptions.measureElement as
            (el: HTMLElement) => number;

        // Create a mock element with getBoundingClientRect
        const MOCK_HEIGHT = 42;
        const mockGetBoundingClientRect = vi.fn().mockReturnValue({height: MOCK_HEIGHT});
        const mockElement = {
            getBoundingClientRect: mockGetBoundingClientRect,
        } as unknown as HTMLElement;

        expect(measureElement(mockElement)).toBe(MOCK_HEIGHT);
        expect(mockGetBoundingClientRect).toHaveBeenCalled();
    });
});
