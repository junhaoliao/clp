import React from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    act,
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";

import usePrestoSearchState, {PRESTO_SEARCH_STATE_DEFAULT} from "../../../stores/presto-search-store";
import useSearchStore, {
    SEARCH_STATE_DEFAULT,
    SEARCH_UI_STATE,
} from "../../../stores/search-store";
import {PrestoSearchControls} from "./PrestoSearchControls";


// Mock API hooks
const mockMutate = vi.fn();
const mockCancelMutate = vi.fn();
const mockClearPrestoMutate = vi.fn();

vi.mock("../../../api", () => ({
    useSubmitPrestoQuery: () => ({
        mutate: mockMutate,
        isPending: false,
    }),
    useCancelPrestoQuery: () => ({
        mutate: mockCancelMutate,
        isPending: false,
    }),
    useClearPrestoResults: () => ({
        mutate: mockClearPrestoMutate,
        isPending: false,
    }),
    useDatasets: () => ({
        data: ["default",
            "dataset1"],
        isPending: false,
    }),
}));

// Mock sql-parser functions
vi.mock("../../../sql-parser", () => ({
    buildSearchQuery: vi.fn(({selectItemList, databaseName, booleanExpression, sortItemList, timestampKey}) => {
        let sql = `SELECT ${selectItemList} FROM ${databaseName}`;
        if (booleanExpression) {
            sql += ` WHERE ${booleanExpression}`;
        }
        if (sortItemList) {
            sql += ` ORDER BY ${sortItemList}`;
        }
        if (timestampKey) {
            sql += ` /* tsKey: ${timestampKey} */`;
        }

        return sql;
    }),
    validateSelectItemList: vi.fn(() => null),
    validateBooleanExpression: vi.fn(() => null),
}));

// Mock SqlEditor (Monaco-based, can't render in jsdom)
vi.mock("../../../components/SqlEditor", () => ({
    __esModule: true,
    default: ({value, onChange, placeholder}: {
        value: string;
        onChange: (val: string) => void;
        placeholder?: string;
    }) => (
        <div data-testid={"sql-editor"}>
            <textarea
                data-testid={"sql-editor-input"}
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                }}/>
        </div>
    ),
}));

// Mock useTimestampColumns hook
const mockTimestampColumnsReturn = {data: ["timestamp"],
    isPending: false};

vi.mock("../hooks/use-timestamp-columns", () => ({
    useTimestampColumns: () => mockTimestampColumnsReturn,
}));

vi.mock("../../../config", () => ({
    SETTINGS_STORAGE_ENGINE: "clp-s",
    SETTINGS_LOGS_INPUT_TYPE: "fs",
    SETTINGS_QUERY_ENGINE: "presto",
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


describe("PrestoSearchControls", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTimestampColumnsReturn.data = ["timestamp"];
        act(() => {
            useSearchStore.setState({...SEARCH_STATE_DEFAULT});
            usePrestoSearchState.setState({...PRESTO_SEARCH_STATE_DEFAULT});
        });
    });

    afterEach(() => {
        cleanup();
    });

    // --- Mode Selector ---

    test("renders Guided and Freeform mode buttons", () => {
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        expect(screen.getByText("Guided")).toBeDefined();
        expect(screen.getByText("Freeform")).toBeDefined();
    });

    test("shows guided form by default", () => {
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        // Guided form has SELECT, FROM, WHERE, ORDER BY inputs
        expect(screen.getByText("SELECT")).toBeDefined();
        expect(screen.getByText("FROM (Dataset)")).toBeDefined();
        expect(screen.getByText("WHERE")).toBeDefined();
        expect(screen.getByText("ORDER BY")).toBeDefined();
    });

    test("switches to freeform mode on Freeform button click", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        await user.click(screen.getByText("Freeform"));

        expect(screen.getByTestId("sql-editor")).toBeDefined();
    });

    test("switches back to guided mode on Guided button click", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        await user.click(screen.getByText("Freeform"));
        expect(screen.getByTestId("sql-editor")).toBeDefined();

        await user.click(screen.getByText("Guided"));
        expect(screen.getByText("SELECT")).toBeDefined();
    });

    test("disables mode buttons during querying", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        expect(screen.getByText("Guided")).toBeDisabled();
        expect(screen.getByText("Freeform")).toBeDisabled();
    });

    // --- Guided Mode ---

    test("renders Run Query button in guided mode", () => {
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        expect(runButtons.length).toBeGreaterThanOrEqual(1);
    });

    test("shows dataset options in guided mode", () => {
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        // The select should contain the mocked datasets
        const select = screen.getByDisplayValue("default");
        expect(select).toBeDefined();
    });

    test("updates SELECT input", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        // Default value is "*"
        const selectInput = screen.getByDisplayValue("*");
        await user.clear(selectInput);
        await user.type(selectInput, "col1, col2");

        expect(usePrestoSearchState.getState().select).toBe("col1, col2");
    });

    test("updates WHERE input", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const whereInput = screen.getByPlaceholderText("Optional boolean expression");
        await user.type(whereInput, "col1 > 10");

        expect(usePrestoSearchState.getState().where).toBe("col1 > 10");
    });

    test("updates ORDER BY input", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const orderByInput = screen.getByPlaceholderText("Optional sort expression");
        await user.type(orderByInput, "col1 DESC");

        expect(usePrestoSearchState.getState().orderBy).toBe("col1 DESC");
    });

    test("submits guided query on Run Query click", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    test("does not submit guided query when select validation fails", async () => {
        const user = userEvent.setup();
        const {validateSelectItemList} = await import("../../../sql-parser");
        (validateSelectItemList as ReturnType<typeof vi.fn>).mockReturnValueOnce([{
            message: "Invalid SELECT",
        }]);

        act(() => {
            usePrestoSearchState.setState({select: "INVALID!"});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(mockMutate).not.toHaveBeenCalled();
    });

    test("does not submit guided query when where validation fails", async () => {
        const user = userEvent.setup();
        const {validateBooleanExpression} = await import("../../../sql-parser");
        (validateBooleanExpression as ReturnType<typeof vi.fn>).mockReturnValueOnce([{
            message: "Invalid WHERE",
        }]);

        act(() => {
            usePrestoSearchState.setState({where: "INVALID!"});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(mockMutate).not.toHaveBeenCalled();
    });

    test("skips where validation when empty", async () => {
        const user = userEvent.setup();
        const {validateBooleanExpression} = await import("../../../sql-parser");

        act(() => {
            usePrestoSearchState.setState({where: ""});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(validateBooleanExpression).not.toHaveBeenCalled();
        expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    // --- Freeform Mode ---

    test("renders SQL editor in freeform mode", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        await user.click(screen.getByText("Freeform"));

        expect(screen.getByTestId("sql-editor")).toBeDefined();
    });

    test("disables Run Query button in freeform mode when query is empty", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        await user.click(screen.getByText("Freeform"));

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        expect(runButtons[0]).toBeDisabled();
    });

    test("enables Run Query button in freeform mode when query is non-empty", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({queryString: "SELECT * FROM default"});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        await user.click(screen.getByText("Freeform"));

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        expect(runButtons[0]).not.toBeDisabled();
    });

    test("submits freeform query on Run Query click", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({queryString: "SELECT * FROM default"});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        await user.click(screen.getByText("Freeform"));

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(mockMutate).toHaveBeenCalledWith(
            {queryString: "SELECT * FROM default"},
            expect.any(Object),
        );
    });

    // --- Cancel ---

    test("shows Cancel button when querying in guided mode", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    });

    test("shows Cancel button when querying in freeform mode", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        await user.click(screen.getByText("Freeform"));

        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    });

    test("calls cancel mutation on Cancel click with valid job ID", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "job-789",
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        await user.click(cancelButtons[0]!);

        expect(mockCancelMutate).toHaveBeenCalledWith({searchJobId: "job-789"});
    });

    test("does not call cancel mutation when searchJobId is null", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: null,
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        await user.click(cancelButtons[0]!);

        expect(mockCancelMutate).not.toHaveBeenCalled();
    });

    // --- Status Messages ---

    test("shows Submitting status during QUERY_ID_PENDING", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERY_ID_PENDING});
        });
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const submittingTexts = screen.getAllByText("Submitting...");
        expect(submittingTexts.length).toBeGreaterThanOrEqual(1);
    });

    test("shows Querying status during QUERYING", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const queryingTexts = screen.getAllByText("Querying...");
        expect(queryingTexts.length).toBeGreaterThanOrEqual(1);
    });

    // --- Mutation Callbacks ---

    test("updates store on successful guided query submission", async () => {
        const user = userEvent.setup();
        mockMutate.mockImplementationOnce((_payload: unknown, options: Record<string, unknown>) => {
            (options.onSuccess as (data: unknown) => void)({searchJobId: 42});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(useSearchStore.getState().searchJobId).toBe("42");
        expect(useSearchStore.getState().searchUiState).toBe(SEARCH_UI_STATE.QUERYING);
    });

    test("updates store on query failure", async () => {
        const user = userEvent.setup();
        mockMutate.mockImplementationOnce((_payload: unknown, options: Record<string, unknown>) => {
            (options.onError as () => void)();
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(useSearchStore.getState().searchUiState).toBe(SEARCH_UI_STATE.FAILED);
    });

    test("updates store on successful freeform query submission", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({queryString: "SELECT 1"});
        });

        mockMutate.mockImplementationOnce((_payload: unknown, options: Record<string, unknown>) => {
            (options.onSuccess as (data: unknown) => void)({searchJobId: 99});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        await user.click(screen.getByText("Freeform"));

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(useSearchStore.getState().searchJobId).toBe("99");
    });

    test("updates dataset selection in guided mode", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const select = screen.getByDisplayValue("default");
        await user.selectOptions(select, "dataset1");

        // The selectedDataset state is local to the component,
        // so verify by checking the select's value
        expect((select as HTMLSelectElement).value).toBe("dataset1");
    });

    test("disables guided form inputs during querying", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        // Check that inputs are disabled
        const selectInput = screen.getByDisplayValue("*");
        expect(selectInput).toBeDisabled();

        const whereInput = screen.getByPlaceholderText("Optional boolean expression");
        expect(whereInput).toBeDisabled();

        const orderByInput = screen.getByPlaceholderText("Optional sort expression");
        expect(orderByInput).toBeDisabled();
    });

    // --- Freeform Cancel and Error ---

    test("shows Cancel button in freeform mode during querying", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "job-100",
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        await user.click(screen.getByText("Freeform"));

        // In freeform mode during querying, should see Cancel button
        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    });

    test("calls cancel mutation in freeform mode on Cancel click", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "job-200",
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        await user.click(screen.getByText("Freeform"));

        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        await user.click(cancelButtons[cancelButtons.length - 1]!);

        expect(mockCancelMutate).toHaveBeenCalledWith({searchJobId: "job-200"});
    });

    test("does not call cancel mutation in freeform when searchJobId is null", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: null,
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        await user.click(screen.getByText("Freeform"));

        const cancelButtons = screen.getAllByRole("button", {name: /cancel/i});
        await user.click(cancelButtons[cancelButtons.length - 1]!);

        expect(mockCancelMutate).not.toHaveBeenCalled();
    });

    test("updates store on freeform query failure", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({queryString: "SELECT 1"});
        });

        mockMutate.mockImplementationOnce((_payload: unknown, options: Record<string, unknown>) => {
            (options.onError as () => void)();
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        await user.click(screen.getByText("Freeform"));

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[runButtons.length - 1]!);

        expect(useSearchStore.getState().searchUiState).toBe(SEARCH_UI_STATE.FAILED);
    });

    test("does not submit freeform query when queryString is empty", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({queryString: "   "});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        await user.click(screen.getByText("Freeform"));

        // The Run Query button should be disabled for whitespace-only query
        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        expect(runButtons[runButtons.length - 1]).toBeDisabled();
    });

    test("handles guided submit with where clause and order by", async () => {
        const user = userEvent.setup();
        act(() => {
            usePrestoSearchState.setState({
                select: "col1",
                where: "col1 > 5",
                orderBy: "col1 DESC",
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(mockMutate).toHaveBeenCalledTimes(1);
        const callArgs = mockMutate.mock.calls[0] as [{queryString: string}, unknown];
        expect(callArgs[0].queryString).toContain("col1 > 5");
        expect(callArgs[0].queryString).toContain("ORDER BY");
    });

    test("shows Submitting and Querying status in freeform mode", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERY_ID_PENDING});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        await user.click(screen.getByText("Freeform"));

        const submittingTexts = screen.getAllByText("Submitting...");
        expect(submittingTexts.length).toBeGreaterThanOrEqual(1);
    });

    // --- Timestamp Key Selector ---

    test("renders Timestamp Key selector in guided mode", () => {
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        expect(screen.getByText("Timestamp Key")).toBeDefined();
    });

    test("auto-selects first timestamp column when none is set", () => {
        act(() => {
            usePrestoSearchState.setState({timestampKey: null});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        // The useEffect should auto-select "timestamp" from mockTimestampColumnsReturn
        expect(usePrestoSearchState.getState().timestampKey).toBe("timestamp");
    });

    test("displays timestamp columns from the hook as options", () => {
        mockTimestampColumnsReturn.data = ["timestamp",
            "created_at",
            "updated_at"];

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const tsSelect = screen.getByDisplayValue("timestamp");
        expect(tsSelect.tagName).toBe("SELECT");

        const options = (tsSelect as HTMLSelectElement).options;
        expect(options.length).toBe(3);
        expect(options[0]!.textContent).toBe("timestamp");
        expect(options[1]!.textContent).toBe("created_at");
        expect(options[2]!.textContent).toBe("updated_at");
    });

    test("updates timestamp key on selection change", async () => {
        const user = userEvent.setup();
        mockTimestampColumnsReturn.data = ["timestamp",
            "created_at"];

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const tsSelect = screen.getByDisplayValue("timestamp");
        await user.selectOptions(tsSelect, "created_at");

        expect(usePrestoSearchState.getState().timestampKey).toBe("created_at");
    });

    test("shows no timestamp columns message when list is empty", () => {
        mockTimestampColumnsReturn.data = [];

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        expect(screen.getByText("No timestamp columns found")).toBeDefined();
    });

    test("disables timestamp key selector when no columns available", () => {
        mockTimestampColumnsReturn.data = [];

        const {container} = render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        // Verify placeholder text is shown
        expect(screen.getByText("No timestamp columns found")).toBeDefined();
        // The timestamp key Select should be rendered inside a disabled trigger
        // Find all select triggers (they are buttons rendered by Radix Select)
        const triggers = container.querySelectorAll('button[data-slot="select-trigger"]');
        // Find the one that is disabled
        const disabledTriggers = Array.from(triggers).filter(
            (t) => t.hasAttribute("disabled"),
        );

        expect(disabledTriggers.length).toBeGreaterThanOrEqual(1);
    });

    test("disables timestamp key selector during querying", () => {
        mockTimestampColumnsReturn.data = ["timestamp"];
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
            usePrestoSearchState.setState({timestampKey: "timestamp"});
        });
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const tsSelect = screen.getByDisplayValue("timestamp");
        expect(tsSelect).toBeDisabled();
    });

    test("uses timestamp key in guided submit query", async () => {
        const user = userEvent.setup();
        act(() => {
            usePrestoSearchState.setState({
                timestampKey: "created_at",
                select: "*",
                where: "",
                orderBy: "",
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(mockMutate).toHaveBeenCalledTimes(1);
        const callArgs = mockMutate.mock.calls[0] as [{queryString: string}, unknown];
        // The SQL should contain created_at as the timestamp key
        expect(callArgs[0].queryString).toContain("created_at");
    });

    test("falls back to 'timestamp' when timestampKey is null", async () => {
        const user = userEvent.setup();
        act(() => {
            usePrestoSearchState.setState({
                timestampKey: null,
                select: "*",
                where: "",
                orderBy: "",
            });
        });
        mockTimestampColumnsReturn.data = [];

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(mockMutate).toHaveBeenCalledTimes(1);
        const callArgs = mockMutate.mock.calls[0] as [{queryString: string}, unknown];
        expect(callArgs[0].queryString).toContain("timestamp");
    });

    // --- Query Preview Drawer ---

    test("renders Preview Query button in guided mode", () => {
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        expect(screen.getByText("Preview Query")).toBeDefined();
    });

    test("reveals query preview on Preview Query click", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        await user.click(screen.getByText("Preview Query"));

        // The button text should change
        expect(screen.getByText("Hide Query Preview")).toBeDefined();

        // The preview should show computed SQL
        const preElements = document.querySelectorAll("pre");
        expect(preElements.length).toBe(1);
        expect(preElements[0]!.textContent).toContain("SELECT");
        expect(preElements[0]!.textContent).toContain("FROM");
    });

    test("hides query preview on Hide Query Preview click", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        // Open the preview
        await user.click(screen.getByText("Preview Query"));
        expect(screen.getByText("Hide Query Preview")).toBeDefined();
        expect(document.querySelectorAll("pre").length).toBe(1);

        // Close it again
        await user.click(screen.getByText("Hide Query Preview"));
        expect(screen.getByText("Preview Query")).toBeDefined();
        expect(document.querySelectorAll("pre").length).toBe(0);
    });

    test("preview shows computed SQL with current form values", async () => {
        const user = userEvent.setup();
        act(() => {
            usePrestoSearchState.setState({
                select: "col1, col2",
                where: "col1 > 10",
                orderBy: "col1 DESC",
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        await user.click(screen.getByText("Preview Query"));

        const preElement = document.querySelector("pre");
        expect(preElement).not.toBeNull();
        const sql = preElement!.textContent!;
        expect(sql).toContain("col1, col2");
        expect(sql).toContain("col1 > 10");
        expect(sql).toContain("col1 DESC");
    });

    test("disables Preview Query button during querying", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const previewButton = screen.getByText("Preview Query");
        expect(previewButton).toBeDisabled();
    });

    test("does not show Preview Query button in freeform mode", async () => {
        const user = userEvent.setup();
        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        await user.click(screen.getByText("Freeform"));

        expect(screen.queryByText("Preview Query")).toBeNull();
    });

    // --- Clear previous results before new query ---

    test("clears previous Presto results before guided submit", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                searchJobId: "old-presto-job",
                numSearchResultsTable: 100,
                numSearchResultsMetadata: 50,
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(mockClearPrestoMutate).toHaveBeenCalledWith({searchJobId: "old-presto-job"});
    });

    test("resets result counts before guided submit", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                searchJobId: "old-presto-job",
                numSearchResultsTable: 100,
                numSearchResultsMetadata: 50,
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(useSearchStore.getState().numSearchResultsTable).toBe(0);
        expect(useSearchStore.getState().numSearchResultsMetadata).toBe(0);
    });

    test("clears previous Presto results before freeform submit", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({
                queryString: "SELECT 1",
                searchJobId: "old-presto-job",
            });
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});
        await user.click(screen.getByText("Freeform"));

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[runButtons.length - 1]!);

        expect(mockClearPrestoMutate).toHaveBeenCalledWith({searchJobId: "old-presto-job"});
    });

    test("does not call clear when no previous searchJobId", async () => {
        const user = userEvent.setup();
        act(() => {
            useSearchStore.setState({searchJobId: null});
        });

        render(<PrestoSearchControls/>, {wrapper: createWrapper()});

        const runButtons = screen.getAllByRole("button", {name: /run query/i});
        await user.click(runButtons[0]!);

        expect(mockClearPrestoMutate).not.toHaveBeenCalled();
    });
});
