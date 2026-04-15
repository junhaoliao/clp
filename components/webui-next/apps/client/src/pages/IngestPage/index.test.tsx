import React from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import {
    afterEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";


// Mock all child components
vi.mock("./components/SpaceSavings", () => ({
    SpaceSavings: () => <div data-testid={"space-savings"}>SpaceSavings</div>,
}));

vi.mock("./components/Details", () => ({
    Details: () => <div data-testid={"details"}>Details</div>,
}));

vi.mock("./components/CompressForm", () => ({
    CompressForm: () => <div data-testid={"compress-form"}>CompressForm</div>,
}));

vi.mock("./components/CompressionJobsTable", () => ({
    CompressionJobsTable: () => (
        <div data-testid={"compression-jobs-table"}>CompressionJobsTable</div>
    ),
}));

// Mock @clp/webui-shared - inline the STORAGE_TYPE to avoid hoisting issues
vi.mock("@clp/webui-shared", () => ({
    STORAGE_TYPE: {FS: "fs", S3: "s3"},
}));

// Mock config - inline "fs" so the CompressForm is rendered by default
vi.mock("../../config", () => ({
    SETTINGS_LOGS_INPUT_TYPE: "fs",
    SETTINGS_STORAGE_ENGINE: "clp-s",
    SETTINGS_QUERY_ENGINE: "clp-s",
    STREAM_TYPE: "json",
}));

// Import after mocks
import IngestPage from "./index";


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


describe("IngestPage", () => {
    afterEach(() => {
        cleanup();
    });

    test("renders SpaceSavings component", () => {
        render(<IngestPage/>, {wrapper: createWrapper()});
        expect(screen.getByTestId("space-savings")).toBeDefined();
    });

    test("renders Details component", () => {
        render(<IngestPage/>, {wrapper: createWrapper()});
        expect(screen.getByTestId("details")).toBeDefined();
    });

    test("renders CompressionJobsTable component", () => {
        render(<IngestPage/>, {wrapper: createWrapper()});
        expect(screen.getByTestId("compression-jobs-table")).toBeDefined();
    });

    test("renders CompressForm when logs input type is FS", () => {
        render(<IngestPage/>, {wrapper: createWrapper()});
        expect(screen.getByTestId("compress-form")).toBeDefined();
    });

    test("renders all child components together", () => {
        render(<IngestPage/>, {wrapper: createWrapper()});
        expect(screen.getByTestId("space-savings")).toBeDefined();
        expect(screen.getByTestId("details")).toBeDefined();
        expect(screen.getByTestId("compress-form")).toBeDefined();
        expect(screen.getByTestId("compression-jobs-table")).toBeDefined();
    });
});
