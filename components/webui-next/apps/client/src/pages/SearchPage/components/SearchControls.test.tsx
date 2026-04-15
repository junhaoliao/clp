import React from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
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
    TIME_RANGE_OPTION,
} from "../../../stores/search-store";
import {SearchControls} from "./SearchControls";


// Radix UI components require ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};


// Mocks
const mockMutate = vi.fn();
const mockCancelMutate = vi.fn();
const mockClearMutate = vi.fn();
const mockDatasetsReturn = {
    data: ["default", "dataset1"] as string[],
    isPending: false,
};

vi.mock("../../../api", () => ({
    useSubmitSearchQuery: () => ({
        mutate: mockMutate,
        isPending: false,
    }),
    useCancelSearchQuery: () => ({
        mutate: mockCancelMutate,
        isPending: false,
    }),
    useClearSearchResults: () => ({
        mutate: mockClearMutate,
        isPending: false,
    }),
    useDatasets: () => mockDatasetsReturn,
}));

vi.mock("../../../config", () => ({
    SETTINGS_MAX_DATASETS_PER_QUERY: 10,
    SETTINGS_STORAGE_ENGINE: "clp-s",
    SETTINGS_LOGS_INPUT_TYPE: "fs",
    SETTINGS_QUERY_ENGINE: "clp-s",
    STREAM_TYPE: "json",
}));


/**
 *
 */
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });

    return ({children}: {children: React.ReactNode}) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};


describe("SearchControls", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        act(() => {
            useSearchStore.setState({...SEARCH_STATE_DEFAULT});
        });
    });

    afterEach(() => {
        cleanup();
    });

    test("renders query input", () => {
        render(<SearchControls/>, {wrapper: createWrapper()});
        const inputs = screen.getAllByPlaceholderText("Enter your query");
        expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    test("renders time range inputs with default display text", () => {
        render(<SearchControls/>, {wrapper: createWrapper()});
        const startInputs = screen.getAllByDisplayValue("First timestamp");
        const endInputs = screen.getAllByDisplayValue("Last timestamp");
        expect(startInputs.length).toBeGreaterThanOrEqual(1);
        expect(endInputs.length).toBeGreaterThanOrEqual(1);
    });

    test("renders search button", () => {
        render(<SearchControls/>, {wrapper: createWrapper()});
        const buttons = screen.getAllByRole("button", {name: /search/i});
        expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    test("disables search button when query is empty", () => {
        render(<SearchControls/>, {wrapper: createWrapper()});
        const buttons = screen.getAllByRole("button", {name: /search/i});
        expect(buttons[0]).toBeDisabled();
    });

    test("enables search button when query is non-empty", () => {
        act(() => {
            useSearchStore.setState({queryString: "error"});
        });
        render(<SearchControls/>, {wrapper: createWrapper()});
        const buttons = screen.getAllByRole("button", {name: /search/i});
        expect(buttons[0]).not.toBeDisabled();
    });

    test("renders case sensitivity toggle", () => {
        render(<SearchControls/>, {wrapper: createWrapper()});
        const toggles = screen.getAllByText("aa");
        expect(toggles.length).toBeGreaterThanOrEqual(1);
    });

    test("toggles case sensitivity on click", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        const toggles = screen.getAllByText("aa");
        await user.click(toggles[0]!);

        const sensitiveToggles = screen.getAllByText("Aa");
        expect(sensitiveToggles.length).toBeGreaterThanOrEqual(1);
    });

    test("renders dataset selector button", () => {
        render(<SearchControls/>, {wrapper: createWrapper()});

        // Auto-selects "default" dataset on mount
        const defaultButtons = screen.getAllByText("default");
        expect(defaultButtons.length).toBeGreaterThanOrEqual(1);
    });

    test("opens dataset dropdown on click", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        const datasetBtn = screen.getAllByText("default")[0]!;
        await user.click(datasetBtn);

        // Should show dataset options
        expect(screen.getByText("dataset1")).toBeDefined();
    });

    test("shows no datasets message when datasets list is empty", async () => {
        // Set empty datasets
        mockDatasetsReturn.data = [];

        // With no datasets available and none selected, button shows "All"
        act(() => {
            useSearchStore.setState({
                selectedDatasets: [],
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        // The dataset button renders "All" when no datasets available
        const allButtons = screen.getAllByText("All");
        expect(allButtons.length).toBeGreaterThanOrEqual(1);

        // Restore datasets
        mockDatasetsReturn.data = ["default", "dataset1"];
    });

    test("toggles dataset selection in dropdown", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        // Open dropdown (auto-selected "default" on mount)
        const datasetBtn = screen.getAllByText("default")[0]!;
        await user.click(datasetBtn);

        // Click on "dataset1" to add it
        const dataset1Checkbox = screen.getByText("dataset1");
        await user.click(dataset1Checkbox);

        // Should have both datasets selected
        expect(useSearchStore.getState().selectedDatasets).toContain("default");
        expect(useSearchStore.getState().selectedDatasets).toContain("dataset1");
    });

    test("does not remove last dataset (keeps at least one)", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({selectedDatasets: ["default"]});
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        // Open dropdown
        const datasetBtn = screen.getAllByText("default")[0]!;
        await user.click(datasetBtn);

        // Uncheck the only dataset - should not remove it
        const checkbox = screen.getByRole("checkbox", {name: /default/});
        await user.click(checkbox);

        // Should still have "default" since it's the last one
        expect(useSearchStore.getState().selectedDatasets).toContain("default");
    });

    test("changes time range option via dropdown", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        // Focus on the time range input to open the dropdown
        const startInputs = screen.getAllByDisplayValue("First timestamp");
        await user.click(startInputs[0]!);

        // Click on "Last 15 Minutes" option in the dropdown
        const option = screen.getByText("Last 15 Minutes");
        await user.click(option);

        expect(useSearchStore.getState().timeRangeOption).toBe(
            TIME_RANGE_OPTION.LAST_15_MINUTES,
        );
    });

    test("shows custom time range inputs when CUSTOM is selected", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        // Focus on the time range input to open the dropdown
        const startInputs = screen.getAllByDisplayValue("First timestamp");
        await user.click(startInputs[0]!);

        // Click on "Custom" option in the dropdown
        const customOption = screen.getByText("Custom");
        await user.click(customOption);

        // Verify the two datetime-local inputs rendered
        const allInputs = document.querySelectorAll('input[type="datetime-local"]');
        expect(allInputs.length).toBe(2);
    });

    test("shows cancel button when querying", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });
        render(<SearchControls/>, {wrapper: createWrapper()});

        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    });

    test("shows submitting status when QUERY_ID_PENDING", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERY_ID_PENDING});
        });
        render(<SearchControls/>, {wrapper: createWrapper()});

        const submittingTexts = screen.getAllByText("Submitting query...");
        expect(submittingTexts.length).toBeGreaterThanOrEqual(1);
    });

    test("shows searching status when QUERYING", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });
        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchingTexts = screen.getAllByText("Searching...");
        expect(searchingTexts.length).toBeGreaterThanOrEqual(1);
    });

    test("shows query failed status when FAILED", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.FAILED});
        });
        render(<SearchControls/>, {wrapper: createWrapper()});

        const failedTexts = screen.getAllByText("Query failed");
        expect(failedTexts.length).toBeGreaterThanOrEqual(1);
    });

    test("submits query when search button clicked with valid input", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({queryString: "test query"});
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        await user.click(searchButtons[0]!);

        expect(mockMutate).toHaveBeenCalledTimes(1);
        const callArgs = mockMutate.mock.calls[0]![0] as Record<string, unknown>;
        expect(callArgs.queryString).toBe("test query");
        expect(callArgs.ignoreCase).toBe(true);
        expect(callArgs.datasets).toEqual(["default"]);
    });

    test("submits query with selected datasets", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                queryString: "test",
                selectedDatasets: ["dataset1"],
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        await user.click(searchButtons[0]!);

        const callArgs = mockMutate.mock.calls[0]![0] as Record<string, unknown>;
        expect(callArgs.datasets).toEqual(["dataset1"]);
    });

    test("calls cancel mutation when cancel is clicked", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "123",
                aggregationJobId: "456",
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        await user.click(cancelButtons[0]!);

        expect(mockCancelMutate).toHaveBeenCalledWith({
            searchJobId: 123,
            aggregationJobId: 456,
        });
    });

    test("disables inputs when querying", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                queryString: "test",
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const textInputs = screen.getAllByPlaceholderText("Enter your query");
        expect(textInputs[0]).toBeDisabled();
    });

    test("updates query string on input change", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        const input = screen.getAllByPlaceholderText("Enter your query")[0]!;
        await user.type(input, "hello");

        expect(useSearchStore.getState().queryString).toBe("hello");
    });

    test("sets time range to all time when ALL_TIME is selected", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({timeRangeOption: TIME_RANGE_OPTION.LAST_15_MINUTES});
        });
        render(<SearchControls/>, {wrapper: createWrapper()});

        // Focus on the time range input to open the dropdown
        const startInput = document.querySelector('input[placeholder="First timestamp"]');
        await user.click(startInput!);

        // Click on "All Time" option
        const allTimeOption = screen.getByText("All Time");
        await user.click(allTimeOption);

        expect(useSearchStore.getState().timeRangeOption).toBe(
            TIME_RANGE_OPTION.ALL_TIME,
        );
    });

    test("does not submit when query string is whitespace only", async () => {
        act(() => {
            useSearchStore.setState({queryString: "   "});
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        expect(searchButtons[0]).toBeDisabled();
    });

    test("updates store on successful query submission", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({queryString: "test query"});
        });

        mockMutate.mockImplementationOnce((_payload: unknown, options: Record<string, unknown>) => {
            (options.onSuccess as (data: unknown) => void)({
                searchJobId: 42,
                aggregationJobId: 99,
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        await user.click(searchButtons[0]!);

        expect(useSearchStore.getState().searchJobId).toBe("42");
        expect(useSearchStore.getState().aggregationJobId).toBe("99");
        expect(useSearchStore.getState().searchUiState).toBe(SEARCH_UI_STATE.QUERYING);
    });

    test("updates store on query failure", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({queryString: "test query"});
        });

        mockMutate.mockImplementationOnce((_payload: unknown, options: Record<string, unknown>) => {
            (options.onError as () => void)();
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        await user.click(searchButtons[0]!);

        expect(useSearchStore.getState().searchUiState).toBe(SEARCH_UI_STATE.FAILED);
    });

    test("updates custom time range start input", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        // Focus on the time range input to open the dropdown
        const startInputs = screen.getAllByDisplayValue("First timestamp");
        await user.click(startInputs[0]!);

        // Click on "Custom" option
        const customOption = screen.getByText("Custom");
        await user.click(customOption);

        // Find the two datetime-local inputs
        const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
        expect(datetimeInputs.length).toBe(2);

        // Change the first (start) datetime input
        await user.type(datetimeInputs[0]!, "2024-06-15T10:00");

        expect(useSearchStore.getState().timeRangeOption).toBe(TIME_RANGE_OPTION.CUSTOM);
    });

    test("updates custom time range end input", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        // Focus on the time range input to open the dropdown
        const startInputs = screen.getAllByDisplayValue("First timestamp");
        await user.click(startInputs[0]!);

        // Click on "Custom" option
        const customOption = screen.getByText("Custom");
        await user.click(customOption);

        const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
        expect(datetimeInputs.length).toBe(2);

        // Change the second (end) datetime input
        await user.type(datetimeInputs[1]!, "2024-06-15T18:00");

        expect(useSearchStore.getState().timeRangeOption).toBe(TIME_RANGE_OPTION.CUSTOM);
    });

    test("removes a dataset when multiple are selected", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({selectedDatasets: ["default",
                "dataset1"]});
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        // Open dropdown
        const datasetBtn = screen.getAllByText(/default|dataset1|All/)[0]!;
        await user.click(datasetBtn);

        // Uncheck "default" - should remove it since there's still "dataset1"
        const checkbox = screen.getByRole("checkbox", {name: /default/});
        await user.click(checkbox);

        expect(useSearchStore.getState().selectedDatasets).toEqual(["dataset1"]);
    });

    test("sets time range to last 1 hour", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        // Focus on the time range input to open the dropdown
        const startInputs = screen.getAllByDisplayValue("First timestamp");
        await user.click(startInputs[0]!);

        const option = screen.getByText("Last Hour");
        await user.click(option);

        expect(useSearchStore.getState().timeRangeOption).toBe(TIME_RANGE_OPTION.LAST_1_HOUR);
    });

    test("sets time range to last 7 days", async () => {
        const user = userEvent.setup();
        render(<SearchControls/>, {wrapper: createWrapper()});

        // Focus on the time range input to open the dropdown
        const startInputs = screen.getAllByDisplayValue("First timestamp");
        await user.click(startInputs[0]!);

        const option = screen.getByText("Last 7 Days");
        await user.click(option);

        expect(useSearchStore.getState().timeRangeOption).toBe(TIME_RANGE_OPTION.LAST_7_DAYS);
    });

    test("does not submit when handleSubmit called with empty query", async () => {
        act(() => {
            useSearchStore.setState({queryString: ""});
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        // Submit the form directly (bypassing the disabled button)
        const form = document.querySelector("form");
        expect(form).not.toBeNull();
        fireEvent.submit(form!);

        expect(mockMutate).not.toHaveBeenCalled();
    });

    test("selects LAST_24_HOURS from a different time range", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({timeRangeOption: TIME_RANGE_OPTION.LAST_15_MINUTES});
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        // Focus on the time range input to open the dropdown
        const startInputs = screen.getAllByDisplayValue("15 minutes ago");
        await user.click(startInputs[0]!);

        const option = screen.getByText("Last 24 Hours");
        await user.click(option);

        expect(useSearchStore.getState().timeRangeOption).toBe(TIME_RANGE_OPTION.LAST_24_HOURS);
    });

    test("submits query with ALL_TIME timestamps as null", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                queryString: "test query",
                timeRangeOption: TIME_RANGE_OPTION.ALL_TIME,
                timeRange: [dayjs(0),
                    dayjs()],
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        await user.click(searchButtons[0]!);

        expect(mockMutate).toHaveBeenCalledTimes(1);
        const callArgs = mockMutate.mock.calls[0]![0] as Record<string, unknown>;
        expect(callArgs.timestampBegin).toBeNull();
        expect(callArgs.timestampEnd).toBeNull();
    });

    test("calls cancel with null job IDs without calling cancel mutation", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: null,
                aggregationJobId: null,
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        await user.click(cancelButtons[0]!);

        expect(mockCancelMutate).not.toHaveBeenCalled();
        expect(useSearchStore.getState().searchUiState).toBe(SEARCH_UI_STATE.DONE);
    });

    test("unquotes wrapped double quotes from query string before submitting", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({queryString: "\"test query\""});
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        await user.click(searchButtons[0]!);

        expect(mockMutate).toHaveBeenCalledTimes(1);
        const callArgs = mockMutate.mock.calls[0]![0] as Record<string, unknown>;
        expect(callArgs.queryString).toBe("test query");
    });

    test("shows warning when selected datasets exceed max", () => {
        // Create enough datasets to exceed the limit
        const manyDatasets = Array.from({length: 12}, (_, i) => `ds${i}`);
        mockDatasetsReturn.data = manyDatasets;

        act(() => {
            useSearchStore.setState({selectedDatasets: manyDatasets});
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        expect(screen.getByText("Max 10 datasets per query")).toBeDefined();

        // Restore
        mockDatasetsReturn.data = ["default", "dataset1"];
    });

    // --- Clear results before new query ---

    test("clears previous results before submitting new query", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                queryString: "new query",
                searchJobId: "old-job-1",
                aggregationJobId: "old-agg-1",
                numSearchResultsTable: 50,
                numSearchResultsTimeline: 20,
                numSearchResultsMetadata: 100,
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        await user.click(searchButtons[0]!);

        expect(mockClearMutate).toHaveBeenCalledWith({
            searchJobId: "old-job-1",
            aggregationJobId: "old-agg-1",
        });
    });

    test("resets result counts before submitting new query", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                queryString: "new query",
                searchJobId: "old-job-1",
                aggregationJobId: "old-agg-1",
                numSearchResultsTable: 50,
                numSearchResultsTimeline: 20,
                numSearchResultsMetadata: 100,
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        await user.click(searchButtons[0]!);

        expect(useSearchStore.getState().numSearchResultsTable).toBe(0);
        expect(useSearchStore.getState().numSearchResultsTimeline).toBe(0);
        expect(useSearchStore.getState().numSearchResultsMetadata).toBe(0);
    });

    test("does not call clear when no previous job IDs", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                queryString: "first query",
                searchJobId: null,
                aggregationJobId: null,
            });
        });

        render(<SearchControls/>, {wrapper: createWrapper()});

        const searchButtons = screen.getAllByRole("button", {name: /search/i});
        await user.click(searchButtons[0]!);

        expect(mockClearMutate).not.toHaveBeenCalled();
    });
});
