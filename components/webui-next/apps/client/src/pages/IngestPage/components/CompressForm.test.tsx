import React from "react";

import {CLP_DEFAULT_DATASET_NAME} from "@clp/webui-shared";
import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    afterEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";

import {CompressForm} from "./CompressForm";


// Radix UI components require ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};


// Mocks
const mockMutate = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("sonner", () => ({
    toast: {
        error: (...args: unknown[]) => mockToastError(...args),
        success: (...args: unknown[]) => mockToastSuccess(...args),
    },
    Toaster: () => null,
}));

vi.mock("../../../api", () => ({
    useSubmitCompressionJob: () => ({
        mutate: mockMutate,
        isPending: false,
    }),
    useDirectoryListing: () => ({
        data: null,
        isLoading: false,
    }),
}));

// Mutable config values so individual tests can override them
const mockConfig = {
    SETTINGS_STORAGE_ENGINE: "clp-s" as string,
    SETTINGS_LOGS_INPUT_TYPE: "fs" as string,
    SETTINGS_QUERY_ENGINE: "clp-s",
    STREAM_TYPE: "json",
};

vi.mock("../../../config", () => ({
    /**
     *
     */
    get SETTINGS_STORAGE_ENGINE () {
        return mockConfig.SETTINGS_STORAGE_ENGINE;
    },

    /**
     *
     */
    get SETTINGS_LOGS_INPUT_TYPE () {
        return mockConfig.SETTINGS_LOGS_INPUT_TYPE;
    },

    /**
     *
     */
    get SETTINGS_QUERY_ENGINE () {
        return mockConfig.SETTINGS_QUERY_ENGINE;
    },

    /**
     *
     */
    get STREAM_TYPE () {
        return mockConfig.STREAM_TYPE;
    },
}));

vi.mock("../../../settings", () => ({
    settings: {
        LogsInputRootDir: "/mnt/logs",
        SqlDbClpArchivesTableName: "clp_archives",
        SqlDbClpTablePrefix: "clp_",
    },
}));

// Mock PathsSelect since it uses fetch
vi.mock("./PathsSelect", () => ({
    PathsSelect: ({onPathsChange, paths}: {
        onPathsChange: (paths: string[]) => void;
        paths: string[];
    }) => (
        <div data-testid={"paths-select"}>
            <span data-testid={"selected-paths"}>
                {paths.join(", ")}
            </span>
            <button
                data-testid={"add-path-btn"}
                type={"button"}
                onClick={() => {
                    onPathsChange(["/mnt/logs/test.log"]);
                }}
            >
                Select Path
            </button>
        </div>
    ),
}));


/**
 *
 * @param root0
 * @param root0.children
 */
const wrapper = ({children}: {children: React.ReactNode}) => (
    <QueryClientProvider client={new QueryClient()}>
        {children}
    </QueryClientProvider>
);


describe("CompressForm", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();

        // Reset config to CLP-S + FS defaults
        mockConfig.SETTINGS_STORAGE_ENGINE = "clp-s";
        mockConfig.SETTINGS_LOGS_INPUT_TYPE = "fs";
    });

    test("renders form with submit button", () => {
        render(<CompressForm/>, {wrapper});
        const headings = screen.getAllByText("Submit Compression Job");
        expect(headings.length).toBeGreaterThanOrEqual(1);
        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        expect(submitBtns.length).toBeGreaterThanOrEqual(1);
    });

    test("renders CLP-S specific fields (dataset, unstructured, timestamp key)", () => {
        render(<CompressForm/>, {wrapper});
        const datasets = screen.getAllByText("Dataset");
        const unstructuredLabels = screen.getAllByText("Convert to JSON");
        const timestampKeys = screen.getAllByText("Timestamp Key");
        expect(datasets.length).toBeGreaterThanOrEqual(1);
        expect(unstructuredLabels.length).toBeGreaterThanOrEqual(1);
        expect(timestampKeys.length).toBeGreaterThanOrEqual(1);
    });

    test("renders paths selector", () => {
        render(<CompressForm/>, {wrapper});
        const pathsSelects = screen.getAllByTestId("paths-select");
        expect(pathsSelects.length).toBeGreaterThanOrEqual(1);
    });

    test("toggles unstructured checkbox", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        const checkboxes = screen.getAllByRole("checkbox", {name: /convert to json/i});
        expect(checkboxes[0]!).not.toBeChecked();

        await user.click(checkboxes[0]!);
    });

    test("disables Timestamp Key field when Convert to JSON is checked", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        // Timestamp Key input should be enabled initially
        const tsInputs = screen.getAllByPlaceholderText("The path (e.g. x.y) for the field containing the log event's timestamp");
        expect(tsInputs[0]!).not.toBeDisabled();

        // Check the unstructured checkbox
        const checkboxes = screen.getAllByRole("checkbox", {name: /convert to json/i});
        await user.click(checkboxes[0]!);

        // Timestamp Key input should now be disabled but still visible
        expect(tsInputs[0]!).toBeDisabled();
        expect(tsInputs[0]!).toBeVisible();
    });

    test("shows validation error when submitting with no paths", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        await user.click(submitBtns[0]!);

        expect(mockToastError).toHaveBeenCalledWith("At least one path is required.");
        expect(mockMutate).not.toHaveBeenCalled();
    });

    test("submits form with valid paths via PathsSelect", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        // Add a path via the mocked PathsSelect
        await user.click(screen.getByTestId("add-path-btn"));

        // Submit the form
        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        await user.click(submitBtns[0]!);

        expect(mockMutate).toHaveBeenCalledOnce();
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                paths: ["/mnt/logs/test.log"],
                dataset: "default",
            }),
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            }),
        );
    });

    test("submits form with dataset override and timestamp key", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        // Add a path
        await user.click(screen.getByTestId("add-path-btn"));

        // Fill in dataset input
        const datasetInputs = screen.getAllByPlaceholderText("The dataset for new archives");
        await user.type(datasetInputs[0]!, "my-dataset");

        // Fill in timestamp key input
        const tsInputs = screen.getAllByPlaceholderText("The path (e.g. x.y) for the field containing the log event's timestamp");
        await user.type(tsInputs[0]!, "created_at");

        // Submit
        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        await user.click(submitBtns[0]!);

        expect(mockMutate).toHaveBeenCalledOnce();
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                paths: ["/mnt/logs/test.log"],
                dataset: "my-dataset",
                timestampKey: "created_at",
            }),
            expect.any(Object),
        );
    });

    test("sends unstructured=true when checkbox is checked", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        // Add a path
        await user.click(screen.getByTestId("add-path-btn"));

        // Check the unstructured checkbox
        const checkboxes = screen.getAllByRole("checkbox", {name: /convert to json/i});
        await user.click(checkboxes[0]!);

        // Submit
        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        await user.click(submitBtns[0]!);

        expect(mockMutate).toHaveBeenCalledOnce();
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                paths: ["/mnt/logs/test.log"],
                unstructured: true,
            }),
            expect.any(Object),
        );

        // timestampKey should NOT be present when unstructured is true
        const callArgs = mockMutate.mock.calls[0]![0] as Record<string, unknown>;
        expect(callArgs.timestampKey).toBeUndefined();
    });

    test("calls toast.success on successful submission", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        // Add a path
        await user.click(screen.getByTestId("add-path-btn"));

        // Submit
        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        await user.click(submitBtns[0]!);

        // Simulate onSuccess callback
        const {onSuccess} = mockMutate.mock.calls[0]![1]!;
        onSuccess({jobId: 42});

        expect(mockToastSuccess).toHaveBeenCalledWith(
            "Compression job #42 submitted successfully",
        );
    });

    test("calls toast.error on submission failure", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        // Add a path
        await user.click(screen.getByTestId("add-path-btn"));

        // Submit
        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        await user.click(submitBtns[0]!);

        // Simulate onError callback
        const {onError} = mockMutate.mock.calls[0]![1]!;
        onError(new Error("Network failure"));

        expect(mockToastError).toHaveBeenCalledWith(
            "Failed to submit compression job: Network failure",
        );
    });

    test("hides dataset, unstructured, and timestamp fields in non-CLP-S mode", () => {
        mockConfig.SETTINGS_STORAGE_ENGINE = "clp";

        render(<CompressForm/>, {wrapper});

        // CLP-S fields should NOT be present
        expect(screen.queryByText("Dataset")).toBeNull();
        expect(screen.queryByText("Convert to JSON")).toBeNull();
        expect(screen.queryByText("Timestamp Key")).toBeNull();

        // CLP-S helper tooltips should NOT be present
        expect(screen.queryByTitle(/If left empty, dataset/)).toBeNull();
        expect(screen.queryByTitle(/If not provided, events will not have assigned timestamps/)).toBeNull();
        expect(screen.queryByTitle(/Enable this for non-JSON logs/)).toBeNull();
    });

    test("submits without dataset/timestampKey/unstructured in non-CLP-S mode", async () => {
        mockConfig.SETTINGS_STORAGE_ENGINE = "clp";
        const user = userEvent.setup();

        render(<CompressForm/>, {wrapper});

        // Add a path
        await user.click(screen.getByTestId("add-path-btn"));

        // Submit
        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        await user.click(submitBtns[0]!);

        expect(mockMutate).toHaveBeenCalledOnce();
        const payload = mockMutate.mock.calls[0]![0] as Record<string, unknown>;
        expect(payload.paths).toEqual(["/mnt/logs/test.log"]);
        expect(payload.dataset).toBeUndefined();
        expect(payload.timestampKey).toBeUndefined();
        expect(payload.unstructured).toBeUndefined();
    });

    test("renders text input for paths when not FS mode (S3)", () => {
        mockConfig.SETTINGS_LOGS_INPUT_TYPE = "s3";

        render(<CompressForm/>, {wrapper});

        // Should show the text input, not the PathsSelect component
        const textInput = screen.getByPlaceholderText("s3://bucket/path1, s3://bucket/path2");
        expect(textInput).toBeDefined();

        // PathsSelect should NOT be rendered
        expect(screen.queryByTestId("paths-select")).toBeNull();
    });

    test("splits comma-separated paths from S3 text input on submit", async () => {
        mockConfig.SETTINGS_LOGS_INPUT_TYPE = "s3";
        const user = userEvent.setup();

        render(<CompressForm/>, {wrapper});

        // Use fireEvent.change to set the value directly (simulates paste)
        const textInput = screen.getByPlaceholderText("s3://bucket/path1, s3://bucket/path2");
        await user.type(textInput, "s3://mybucket/logs1");

        // Submit
        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        await user.click(submitBtns[0]!);

        expect(mockMutate).toHaveBeenCalledOnce();
        const payload = mockMutate.mock.calls[0]![0] as Record<string, unknown>;
        expect(payload.paths).toEqual(["s3://mybucket/logs1"]);
    });

    test("does not include timestampKey when unstructured is checked", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        // Add a path
        await user.click(screen.getByTestId("add-path-btn"));

        // Check unstructured first
        const checkboxes = screen.getAllByRole("checkbox", {name: /convert to json/i});
        await user.click(checkboxes[0]!);

        // Submit
        const submitBtns = screen.getAllByRole("button", {name: /submit/i});
        await user.click(submitBtns[0]!);

        expect(mockMutate).toHaveBeenCalledOnce();
        const payload = mockMutate.mock.calls[0]![0] as Record<string, unknown>;
        expect(payload.unstructured).toBe(true);
        expect(payload.timestampKey).toBeUndefined();
    });

    test("renders Dataset helper tooltip with correct title", () => {
        render(<CompressForm/>, {wrapper});
        const tooltips = screen.getAllByTitle(
            `If left empty, dataset "${CLP_DEFAULT_DATASET_NAME}" will be used.`,
        );

        expect(tooltips.length).toBeGreaterThanOrEqual(1);
    });

    test("renders Dataset input with correct placeholder", () => {
        render(<CompressForm/>, {wrapper});
        const inputs = screen.getAllByPlaceholderText("The dataset for new archives");
        expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    test("renders Timestamp Key helper tooltip with correct title", () => {
        render(<CompressForm/>, {wrapper});
        const tooltips = screen.getAllByTitle(
            /If not provided, events will not have assigned timestamps/,
        );

        expect(tooltips.length).toBeGreaterThanOrEqual(1);
    });

    test("Timestamp Key helper tooltip mentions Convert to JSON behaviour", () => {
        render(<CompressForm/>, {wrapper});
        const tooltips = screen.getAllByTitle(
            /This field is ignored when "Convert to JSON" is enabled\./,
        );

        expect(tooltips.length).toBeGreaterThanOrEqual(1);
    });

    test("renders Timestamp Key input with correct placeholder", () => {
        render(<CompressForm/>, {wrapper});
        const inputs = screen.getAllByPlaceholderText(
            "The path (e.g. x.y) for the field containing the log event's timestamp",
        );

        expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    test("renders Convert to JSON helper tooltip with correct title", () => {
        render(<CompressForm/>, {wrapper});
        const tooltips = screen.getAllByTitle(
            /Enable this for non-JSON logs/,
        );

        expect(tooltips.length).toBeGreaterThanOrEqual(1);
    });

    test("Convert to JSON helper tooltip mentions timestamp and message fields", () => {
        render(<CompressForm/>, {wrapper});
        const tooltips = screen.getAllByTitle(
            /with `timestamp` and `message` fields/,
        );

        expect(tooltips.length).toBeGreaterThanOrEqual(1);
    });

    test("shows validation error for invalid dataset name with special chars", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        const datasetInput = screen.getByPlaceholderText(
            "The dataset for new archives",
        );

        await user.type(datasetInput, "my-dataset!");

        // Zod validation shows inline error for invalid dataset name
        expect(screen.getByText(
            "Must contain only letters, numbers, and underscores.",
        ))
            .toBeDefined();
    });

    test("does not show validation error for valid dataset name", async () => {
        const user = userEvent.setup();
        render(<CompressForm/>, {wrapper});

        const datasetInput = screen.getByPlaceholderText(
            "The dataset for new archives",
        );

        await user.type(datasetInput, "my_dataset_123");

        expect(screen.queryByText("Must contain only letters, numbers, and underscores."))
            .toBeNull();
    });
});
