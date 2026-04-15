import React from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    cleanup,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";


// Mock API client
const mockSqlPost = vi.fn();
vi.mock("../../../lib/api-client", () => ({
    api: {
        api: {
            "archive-metadata": {
                sql: {
                    $post: (...args: unknown[]) => mockSqlPost(...args),
                },
            },
        },
    },
}));

// Default mock settings (CLP-S mode)
vi.mock("../../../settings", () => ({
    settings: {
        ClpStorageEngine: "clp-s",
        SqlDbClpTablePrefix: "clp_",
        SqlDbClpDatasetsTableName: "clp_datasets",
        SqlDbClpArchivesTableName: "clp_archives",
        SqlDbClpFilesTableName: "clp_files",
    },
}));

// Import after mocks
import {settings} from "../../../settings";
import {Details} from "./Details";


/**
 *
 */
const createTestHarness = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {retry: false},
        },
    });

    const wrapper = ({children}: {children: React.ReactNode}) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    return {queryClient, wrapper};
};


describe("Details", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        settings.ClpStorageEngine = "clp-s";
        settings.SqlDbClpTablePrefix = "clp_";
        settings.SqlDbClpDatasetsTableName = "clp_datasets";
        settings.SqlDbClpArchivesTableName = "clp_archives";
        settings.SqlDbClpFilesTableName = "clp_files";
    });

    afterEach(async () => {
        await queryClient?.cancelQueries();
        queryClient?.clear();
        cleanup();
        vi.clearAllMocks();
    });

    it("renders in CLP mode using buildClpDetailsSql", async () => {
        settings.ClpStorageEngine = "clp";

        mockSqlPost.mockImplementation(() => Promise.resolve({
            ok: true,
            json: async () => [{
                begin_timestamp: 1672531200000,
                end_timestamp: 1672617600000,
                num_files: 42,
                num_messages: 9999,
            }],
        }));

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        await waitFor(() => {
            expect(screen.getByText(/January 1, 2023/)).toBeDefined();
        });

        expect(mockSqlPost).toHaveBeenCalled();
        const detailsCall = mockSqlPost.mock.calls.find((call) => {
            const args = call[0] as {json: {queryString: string}};

            return args?.json?.queryString?.includes("clp_archives");
        });

        expect(detailsCall).toBeDefined();
        expect((detailsCall![0] as {json: {queryString: string}}).json.queryString).toContain("clp_files");
    });

    it("shows date range when begin_timestamp is 0 (epoch)", async () => {
        settings.ClpStorageEngine = "clp";

        mockSqlPost.mockImplementation(() => Promise.resolve({
            ok: true,
            json: async () => [{
                begin_timestamp: 0,
                end_timestamp: 1679877135936,
                num_files: 0,
                num_messages: 0,
            }],
        }));

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        await waitFor(() => {
            expect(screen.getByText(/January 1, 1970/)).toBeDefined();
        }, {timeout: 5000});
    });

    it("shows default values when CLP mode details query returns non-ok", async () => {
        settings.ClpStorageEngine = "clp";

        mockSqlPost.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({error: "fail"}),
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        await waitFor(() => {
            expect(screen.getByText("No timestamp data")).toBeDefined();
        });
    });

    it("shows default values when CLP mode details query returns empty rows", async () => {
        settings.ClpStorageEngine = "clp";

        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        await waitFor(() => {
            expect(screen.getByText("No timestamp data")).toBeDefined();
        });
    });

    it("formats numbers with locale strings in CLP mode", async () => {
        settings.ClpStorageEngine = "clp";

        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                begin_timestamp: 1672531200000,
                end_timestamp: 1672617600000,
                num_files: 1000,
                num_messages: 50000,
            }],
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        await waitFor(() => {
            expect(screen.getByText(/January 1, 2023/)).toBeDefined();
        });

        const messagesText = screen.getByText((content) => "50,000" === content || "50000" === content);

        expect(messagesText).toBeDefined();
    });

    it("renders all three cards in CLP mode", async () => {
        settings.ClpStorageEngine = "clp";

        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                begin_timestamp: 1679900000000,
                end_timestamp: 1679999999000,
                num_files: 10,
                num_messages: 50000,
            }],
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        expect(screen.getByText("Time Range")).toBeDefined();
        expect(screen.getByText("Messages")).toBeDefined();
        expect(screen.getByText("Files")).toBeDefined();

        await waitFor(() => {
            expect(screen.getByText(/March 27, 2023/)).toBeDefined();
        });
    });

    it("renders only Time Range card in CLP-S mode (hides Messages and Files)", async () => {
        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [{name: "default"}],
        });
        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                begin_timestamp: 1679900000000,
                end_timestamp: 1679999999000,
                num_files: 10,
                num_messages: 50000,
            }],
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        // Time Range card should be present
        expect(screen.getByText("Time Range")).toBeDefined();

        // Messages and Files cards should NOT be present in CLP-S mode
        expect(screen.queryByText("Messages")).toBeNull();
        expect(screen.queryByText("Files")).toBeNull();

        await waitFor(() => {
            expect(screen.getByText(/March 27, 2023/)).toBeDefined();
        });
    });

    it("shows formatted date range when CLP-S details have timestamps", async () => {
        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [{name: "mydata"}],
        });
        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                begin_timestamp: 1672531200000,
                end_timestamp: 1672617600000,
                num_files: 5,
                num_messages: 1000,
            }],
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        await waitFor(() => {
            expect(screen.getByText(/January 1, 2023/)).toBeDefined();
            expect(screen.getByText(/January 2, 2023/)).toBeDefined();
        });

        // Messages and Files should not appear in CLP-S mode
        expect(screen.queryByText("Messages")).toBeNull();
        expect(screen.queryByText("Files")).toBeNull();
    });

    it("shows No timestamp data when timestamps are null in CLP-S mode", async () => {
        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [{name: "tsnull"}],
        });
        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                begin_timestamp: null,
                end_timestamp: null,
                num_files: 3,
                num_messages: 200,
            }],
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        await waitFor(() => {
            expect(screen.getByText("No timestamp data")).toBeDefined();
        });
    });

    it("returns empty array when fetchDatasetNames gets non-ok response", async () => {
        mockSqlPost.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({error: "Internal Server Error"}),
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        await waitFor(() => {
            expect(screen.getByText("No timestamp data")).toBeDefined();
        });

        expect(mockSqlPost).toHaveBeenCalledTimes(1);
    });

    it("handles empty dataset names in CLP-S mode", async () => {
        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        await waitFor(() => {
            expect(screen.getByText("No timestamp data")).toBeDefined();
        });

        expect(mockSqlPost).toHaveBeenCalledTimes(1);
    });

    it("shows 0 for null num_files and num_messages in CLP mode", async () => {
        settings.ClpStorageEngine = "clp";

        mockSqlPost.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                begin_timestamp: 1672531200000,
                end_timestamp: 1672617600000,
                num_files: null,
                num_messages: null,
            }],
        });

        const harness = createTestHarness();
        queryClient = harness.queryClient;
        render(<Details/>, {wrapper: harness.wrapper});

        // Wait for the mock to be called
        await waitFor(() => {
            expect(mockSqlPost).toHaveBeenCalledTimes(1);
        });

        // Wait for the data to render
        await waitFor(() => {
            // With null num_files/num_messages, ?? 0 should render "0"
            const zeroElements = screen.getAllByText("0");
            expect(zeroElements.length).toBeGreaterThanOrEqual(2);
        });
    });
});
