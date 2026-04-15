import React from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    render,
    screen,
} from "@testing-library/react";
import {
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";

import {
    CompressionJobsTable,
    CompressionJobStatus,
    mapJobResponseToTableData,
} from "./CompressionJobsTable";


// Mocks
const mockJobsReturn = {
    data: null as unknown,
    isLoading: false,
};

vi.mock("../../../api", () => ({
    useCompressionJobs: () => mockJobsReturn,
}));

vi.mock("../../../config", () => ({
    SETTINGS_STORAGE_ENGINE: "clp-s",
    SETTINGS_LOGS_INPUT_TYPE: "fs",
    SETTINGS_QUERY_ENGINE: "clp-s",
    STREAM_TYPE: "json",
}));

vi.mock("../../../settings", () => ({
    settings: {
        SqlDbClpArchivesTableName: "clp_archives",
        SqlDbClpTablePrefix: "clp_",
    },
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


describe("CompressionJobStatus", () => {
    test("has correct enum values", () => {
        expect(CompressionJobStatus.PENDING).toBe(0);
        expect(CompressionJobStatus.RUNNING).toBe(1);
        expect(CompressionJobStatus.SUCCEEDED).toBe(2);
        expect(CompressionJobStatus.FAILED).toBe(3);
        expect(CompressionJobStatus.KILLED).toBe(4);
    });
});

describe("mapJobResponseToTableData", () => {
    test("maps raw jobs to table data", () => {
        const rawJobs = [{
            _id: 1,
            status: 2,
            status_msg: "",
            uncompressed_size: 1000000,
            compressed_size: 100000,
            duration: 10,
            start_time: null,
            update_time: "2024-01-01T00:00:00Z",
            clp_config: {
                input: {paths_to_compress: ["/var/log/test.log"], dataset: "default"},
                output: {},
            },
        }];

        const result = mapJobResponseToTableData(rawJobs, true, true);

        expect(result).toHaveLength(1);
        expect(result[0]!.jobId).toBe("1");
        expect(result[0]!.status).toBe(2);
        expect(result[0]!.dataset).toBe("default");
        expect(result[0]!.paths).toEqual(["/var/log/test.log"]);
        expect(result[0]!.dataIngested).toBeTruthy();
        expect(result[0]!.compressedSize).toBeTruthy();
    });

    test("handles missing config gracefully", () => {
        const rawJobs = [{
            _id: 2,
            status: 0,
            uncompressed_size: 0,
            compressed_size: 0,
            duration: null,
            start_time: null,
        }];

        const result = mapJobResponseToTableData(rawJobs, false, false);

        expect(result).toHaveLength(1);
        expect(result[0]!.jobId).toBe("2");
        expect(result[0]!.speed).toBe("N/A");
    });

    test("computes speed from start_time when no duration", () => {
        const rawJobs = [{
            _id: 3,
            status: 1,
            uncompressed_size: 10000,
            compressed_size: 1000,
            duration: null,
            start_time: new Date(Date.now() - 5000).toISOString(),
        }];

        const result = mapJobResponseToTableData(rawJobs, false, false);

        expect(result[0]!.speed).toContain("/s");
        expect(result[0]!.speed).not.toBe("N/A");
    });

    test("uses id when _id is missing", () => {
        const rawJobs = [{
            id: "abc-123",
            status: 0,
            uncompressed_size: 0,
            compressed_size: 0,
            duration: null,
            start_time: null,
        }];

        const result = mapJobResponseToTableData(rawJobs, false, false);

        expect(result[0]!.jobId).toBe("abc-123");
    });

    test("returns null dataset for CLP mode", () => {
        const rawJobs = [{
            _id: 4,
            status: 2,
            uncompressed_size: 1000,
            compressed_size: 100,
            duration: 5,
            start_time: null,
            clp_config: {
                input: {paths_to_compress: ["/test"], dataset: "ignored"},
                output: {},
            },
        }];

        const result = mapJobResponseToTableData(rawJobs, false, true);

        expect(result[0]!.dataset).toBeNull();
    });

    test("returns empty paths for non-FS mode", () => {
        const rawJobs = [{
            _id: 5,
            status: 2,
            uncompressed_size: 1000,
            compressed_size: 100,
            duration: 5,
            start_time: null,
            clp_config: {
                input: {paths_to_compress: ["/test"]},
            },
        }];

        const result = mapJobResponseToTableData(rawJobs, true, false);

        expect(result[0]!.paths).toEqual([]);
    });

    test("handles zero duration", () => {
        const rawJobs = [{
            _id: 6,
            status: 2,
            uncompressed_size: 1000,
            compressed_size: 100,
            duration: 0,
            start_time: null,
        }];

        const result = mapJobResponseToTableData(rawJobs, false, false);

        expect(result[0]!.speed).toBe("N/A");
    });

    test("strips path_prefix_to_remove from paths", () => {
        const rawJobs = [{
            _id: 7,
            status: 2,
            uncompressed_size: 1000,
            compressed_size: 100,
            duration: 5,
            start_time: null,
            clp_config: {
                input: {
                    paths_to_compress: ["/mnt/logs/home/user/file.log"],
                    path_prefix_to_remove: "/mnt/logs",
                    dataset: "default",
                },
            },
        }];

        const result = mapJobResponseToTableData(rawJobs, true, true);

        expect(result[0]!.paths).toEqual(["/home/user/file.log"]);
        expect(result[0]!.dataset).toBe("default");
    });

    test("does not strip when path does not start with prefix", () => {
        const rawJobs = [{
            _id: 8,
            status: 2,
            uncompressed_size: 1000,
            compressed_size: 100,
            duration: 5,
            start_time: null,
            clp_config: {
                input: {
                    paths_to_compress: ["/other/path/file.log"],
                    path_prefix_to_remove: "/mnt/logs",
                },
            },
        }];

        const result = mapJobResponseToTableData(rawJobs, true, true);

        expect(result[0]!.paths).toEqual(["/other/path/file.log"]);
    });
});

describe("CompressionJobsTable", () => {
    beforeEach(() => {
        mockJobsReturn.data = null;
        mockJobsReturn.isLoading = false;
    });

    test("renders table header", () => {
        render(<CompressionJobsTable/>, {wrapper});
        const headings = screen.getAllByText("Compression Jobs");
        expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    test("shows empty state when no jobs", () => {
        render(<CompressionJobsTable/>, {wrapper});
        const empties = screen.getAllByText("No compression jobs found.");
        expect(empties.length).toBeGreaterThanOrEqual(1);
    });

    test("shows loading state", () => {
        mockJobsReturn.isLoading = true;
        render(<CompressionJobsTable/>, {wrapper});
        const loadings = screen.getAllByText("Loading jobs...");
        expect(loadings.length).toBeGreaterThanOrEqual(1);
    });

    test("renders job rows with data", () => {
        mockJobsReturn.data = [{
            _id: "job1",
            status: 2,
            status_msg: "done",
            uncompressed_size: 1000000,
            compressed_size: 100000,
            duration: 10,
            start_time: null,
            clp_config: {
                input: {paths_to_compress: ["/var/log/a.log",
                    "/var/log/b.log"],
                dataset: "myds"},
                output: {},
            },
        }];

        render(<CompressionJobsTable/>, {wrapper});

        expect(screen.getByText("job1")).toBeDefined();
        expect(screen.getByText("Succeeded")).toBeDefined();
        expect(screen.getByText("myds")).toBeDefined();
        expect(screen.getByText("/var/log/a.log, /var/log/b.log")).toBeDefined();
    });

    test("renders Unknown status for unrecognized status value", () => {
        mockJobsReturn.data = [{
            _id: "job-unknown",
            status: 99,
            status_msg: "",
            uncompressed_size: 0,
            compressed_size: 0,
            duration: null,
            start_time: null,
        }];

        render(<CompressionJobsTable/>, {wrapper});

        expect(screen.getByText("job-unknown")).toBeDefined();
        expect(screen.getByText("Unknown")).toBeDefined();
    });

    test("renders all known statuses with correct labels", () => {
        const jobs = [
            {_id: "s0", status: 0, uncompressed_size: 0, compressed_size: 0, duration: null, start_time: null},
            {_id: "s1", status: 1, uncompressed_size: 0, compressed_size: 0, duration: null, start_time: null},
            {_id: "s3", status: 3, uncompressed_size: 0, compressed_size: 0, duration: null, start_time: null},
            {_id: "s4", status: 4, uncompressed_size: 0, compressed_size: 0, duration: null, start_time: null},
        ];

        mockJobsReturn.data = jobs;

        render(<CompressionJobsTable/>, {wrapper});

        expect(screen.getByText("Submitted")).toBeDefined();
        expect(screen.getByText("Running")).toBeDefined();
        expect(screen.getByText("Failed")).toBeDefined();
        expect(screen.getByText("Killed")).toBeDefined();
    });
});
