import React from "react";

import {
    act,
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";

import useSearchStore, {
    SEARCH_STATE_DEFAULT,
    SEARCH_UI_STATE,
} from "../../../stores/search-store";
import {PrestoResultsTable} from "./PrestoResultsTable";


// Mock useCursor to return controlled results
const mockUseCursor = vi.fn();
vi.mock("../../../hooks/use-cursor", () => ({
    useCursor: (...args: unknown[]) => mockUseCursor(...args),
}));

// Mock MongoSocketCollection
const mockMongoSocketCollectionConstructor = vi.fn();
const mockFind = vi.fn().mockReturnValue({});

// Use a named function so it can be invoked with `new` in the useCursor factory.
vi.mock("../../../api/socket/MongoSocketCollection", () => ({
    __esModule: true,

    default: vi.fn(function MockMongoSocketCollection (this: unknown, ...args: unknown[]) {
        mockMongoSocketCollectionConstructor(...args);
        this.find = mockFind;
    }),
}));

// Mock @tanstack/react-virtual
interface VirtualItem {
    index: number;
    key: string;
    size: number;
    start: number;
}

const mockGetVirtualItems = vi.fn((): VirtualItem[] => []);
const mockGetTotalSize = vi.fn(() => 0);

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
        };
    },
}));

// Mock DashboardCard
vi.mock("../../../components/dashboard/DashboardCard", () => ({
    DashboardCard: ({title, children}: {title: string; children?: React.ReactNode}) => (
        <div data-testid={"dashboard-card"}>
            <p>
                {title}
            </p>
            <div data-testid={"card-content"}>
                {children}
            </div>
        </div>
    ),
}));


describe("PrestoResultsTable", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

    test("renders Query Results card", () => {
        render(<PrestoResultsTable/>);
        expect(screen.getByText("Query Results")).toBeDefined();
    });

    test("shows no results available when results are null", () => {
        mockUseCursor.mockReturnValue(null);
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.DEFAULT});
        });

        render(<PrestoResultsTable/>);
        expect(screen.getByText("No results available.")).toBeDefined();
    });

    test("shows no results available when results are empty", () => {
        mockUseCursor.mockReturnValue([]);
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });

        render(<PrestoResultsTable/>);
        expect(screen.getByText("No results available.")).toBeDefined();
    });

    test("shows loading results when querying and no results yet", () => {
        mockUseCursor.mockReturnValue(null);
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "job-1",
            });
        });

        render(<PrestoResultsTable/>);
        expect(screen.getByText("Loading results...")).toBeDefined();
    });

    test("shows results count when results are present", () => {
        const results = [
            {row: {col1: "value1", col2: "value2"}},
            {row: {col1: "value3", col2: "value4"}},
        ];

        mockUseCursor.mockReturnValue(results);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, key: "0", size: 36, start: 0},
            {index: 1, key: "1", size: 36, start: 36},
        ]);
        mockGetTotalSize.mockReturnValue(72);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });

        render(<PrestoResultsTable/>);
        expect(screen.getByText("2 results")).toBeDefined();
    });

    test("renders column headers from result data", () => {
        const results = [
            {row: {name: "Alice", age: "30", city: "NYC"}},
        ];

        mockUseCursor.mockReturnValue(results);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, key: "0", size: 36, start: 0},
        ]);
        mockGetTotalSize.mockReturnValue(36);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });

        render(<PrestoResultsTable/>);
        expect(screen.getByText("name")).toBeDefined();
        expect(screen.getByText("age")).toBeDefined();
        expect(screen.getByText("city")).toBeDefined();
    });

    test("renders virtualized result rows", () => {
        const results = [
            {row: {col1: "val1", col2: "val2"}},
            {row: {col1: "val3", col2: "val4"}},
        ];

        mockUseCursor.mockReturnValue(results);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, key: "0", size: 36, start: 0},
            {index: 1, key: "1", size: 36, start: 36},
        ]);
        mockGetTotalSize.mockReturnValue(72);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });

        render(<PrestoResultsTable/>);
        expect(screen.getByText("val1")).toBeDefined();
        expect(screen.getByText("val2")).toBeDefined();
        expect(screen.getByText("val3")).toBeDefined();
        expect(screen.getByText("val4")).toBeDefined();
    });

    test("skips rows without row data", () => {
        const results = [
            {row: {col1: "visible"}},
            {row: null},
        ];

        mockUseCursor.mockReturnValue(results);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, key: "0", size: 36, start: 0},
            {index: 1, key: "1", size: 36, start: 36},
        ]);
        mockGetTotalSize.mockReturnValue(72);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });

        render(<PrestoResultsTable/>);
        expect(screen.getByText("visible")).toBeDefined();
    });

    test("handles null column values by showing empty string", () => {
        const results = [
            {row: {col1: null, col2: "defined"}},
        ];

        mockUseCursor.mockReturnValue(results);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, key: "0", size: 36, start: 0},
        ]);
        mockGetTotalSize.mockReturnValue(36);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });

        render(<PrestoResultsTable/>);
        expect(screen.getByText("defined")).toBeDefined();
    });

    test("updates numSearchResultsTable in store when results change", () => {
        const results = [
            {row: {col1: "v1"}},
            {row: {col1: "v2"}},
            {row: {col1: "v3"}},
        ];

        mockUseCursor.mockReturnValue(results);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, key: "0", size: 36, start: 0},
            {index: 1, key: "1", size: 36, start: 36},
            {index: 2, key: "2", size: 36, start: 72},
        ]);
        mockGetTotalSize.mockReturnValue(108);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
                numSearchResultsTable: 0,
            });
        });

        render(<PrestoResultsTable/>);

        expect(useSearchStore.getState().numSearchResultsTable).toBe(3);
    });

    test("does not show loading when querying but results exist", () => {
        const results = [
            {row: {col1: "value"}},
        ];

        mockUseCursor.mockReturnValue(results);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, key: "0", size: 36, start: 0},
        ]);
        mockGetTotalSize.mockReturnValue(36);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "job-1",
            });
        });

        render(<PrestoResultsTable/>);

        // Should show results, not "Loading results..."
        expect(screen.queryByText("Loading results...")).toBeNull();
        expect(screen.getByText("1 results")).toBeDefined();
    });

    // ----- useCursor factory function coverage -----

    test("useCursor factory returns null when searchJobId is null", () => {
        vi.clearAllMocks();
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DEFAULT,
                searchJobId: null,
            });
        });
        mockUseCursor.mockReturnValue(null);
        render(<PrestoResultsTable/>);

        // Capture the factory function passed to useCursor and execute it
        const {calls} = mockUseCursor.mock;
        const factory = calls[calls.length - 1][0] as () => unknown;
        expect(factory()).toBeNull();
    });

    test("useCursor factory creates MongoSocketCollection and calls find with correct options", () => {
        vi.clearAllMocks();
        const mockFindResult = {mockCursor: true};
        mockFind.mockReturnValue(mockFindResult);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "test-job-42",
            });
        });
        mockUseCursor.mockReturnValue(null);
        render(<PrestoResultsTable/>);

        // Capture the factory function passed to useCursor and execute it
        const {calls} = mockUseCursor.mock;
        const factory = calls[calls.length - 1][0] as () => unknown;
        const result = factory();

        expect(mockMongoSocketCollectionConstructor).toHaveBeenCalledWith("test-job-42");
        expect(mockFind).toHaveBeenCalledWith({}, {
            sort: {_id: -1},
            limit: 1000,
        });
        expect(result).toBe(mockFindResult);
    });

    // ----- useVirtualizer measureElement coverage -----

    test("measureElement returns the element's bounding client rect height", () => {
        const results = [
            {row: {col1: "value"}},
        ];

        mockUseCursor.mockReturnValue(results);
        mockGetVirtualItems.mockReturnValue([
            {index: 0, key: "0", size: 36, start: 0},
        ]);
        mockGetTotalSize.mockReturnValue(36);

        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "job-1",
            });
        });

        render(<PrestoResultsTable/>);

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
