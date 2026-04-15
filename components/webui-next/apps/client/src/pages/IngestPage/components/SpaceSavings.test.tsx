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

import {
    computeSpaceSavingsPercent,
    SpaceSavings,
} from "./SpaceSavings";


// Mutable config value so we can switch between CLP and CLP-S
let configStorageEngine = "clp-s";

// Mock the API hooks
const mockArchiveStatsReturn = {
    data: null as unknown,
    isPending: false,
};

const mockDatasetsReturn = {
    data: ["default"],
    isPending: false,
};

vi.mock("../../../api", () => ({
    useArchiveStats: () => mockArchiveStatsReturn,
    useDatasets: () => mockDatasetsReturn,
    useSqlQuery: () => ({
        mutate: vi.fn(),
        data: null,
        isPending: false,
    }),
}));

// Mock config using getter for mutable SETTINGS_STORAGE_ENGINE
vi.mock("../../../config", () => ({
    /**
     *
     */
    get SETTINGS_STORAGE_ENGINE () {
        return configStorageEngine;
    },
    SETTINGS_LOGS_INPUT_TYPE: "fs",
    SETTINGS_QUERY_ENGINE: "clp-s",
    STREAM_TYPE: "json",
}));

// Mock settings
vi.mock("../../../settings", () => ({
    settings: {
        SqlDbClpArchivesTableName: "clp_archives",
        SqlDbClpTablePrefix: "clp_",
    },
}));

/**
 *
 */
const createWrapper = () => {
    const client = new QueryClient({
        defaultOptions: {
            queries: {retry: false},
        },
    });

    return ({children}: {children: React.ReactNode}) => (
        <QueryClientProvider client={client}>
            {children}
        </QueryClientProvider>
    );
};


describe("computeSpaceSavingsPercent", () => {
    test("returns 0% for zero uncompressed size", () => {
        expect(computeSpaceSavingsPercent(0, 0)).toBe("0.00%");
    });

    test("computes savings correctly", () => {
        expect(computeSpaceSavingsPercent(100, 20)).toBe("80.00%");
    });

    test("shows 0% savings when sizes are equal", () => {
        expect(computeSpaceSavingsPercent(100, 100)).toBe("0.00%");
    });
});

describe("SpaceSavings", () => {
    afterEach(() => {
        cleanup();
        mockArchiveStatsReturn.data = null;
        mockDatasetsReturn.data = ["default"];
        configStorageEngine = "clp-s";
    });

    test("renders space savings card", () => {
        render(<SpaceSavings/>, {wrapper: createWrapper()});
        const headings = screen.getAllByText("Space Savings");
        expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    test("renders uncompressed and compressed cards", () => {
        render(<SpaceSavings/>, {wrapper: createWrapper()});
        const uncompressed = screen.getAllByText("Uncompressed");
        const compressed = screen.getAllByText("Compressed");
        expect(uncompressed.length).toBeGreaterThanOrEqual(1);
        expect(compressed.length).toBeGreaterThanOrEqual(1);
    });

    test("shows 0.00% when no data", () => {
        mockArchiveStatsReturn.data = null;
        render(<SpaceSavings/>, {wrapper: createWrapper()});
        const percentages = screen.getAllByText("0.00%");
        expect(percentages.length).toBeGreaterThanOrEqual(1);
    });

    test("shows real data when stats are loaded", () => {
        mockArchiveStatsReturn.data = [
            {total_uncompressed_size: 1000, total_compressed_size: 200},
        ];
        render(<SpaceSavings/>, {wrapper: createWrapper()});
        const savings = screen.getAllByText("80.00%");
        expect(savings.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("1000 Bytes")).toBeDefined();
        expect(screen.getByText("200 Bytes")).toBeDefined();
    });

    test("shows 0.00% when datasets are empty in CLP-S mode", () => {
        mockDatasetsReturn.data = [];
        mockArchiveStatsReturn.data = null;
        render(<SpaceSavings/>, {wrapper: createWrapper()});
        const percentages = screen.getAllByText("0.00%");
        expect(percentages.length).toBeGreaterThanOrEqual(1);
    });

    test("uses buildClpSpaceSavingsSql in CLP mode", () => {
        configStorageEngine = "clp";
        mockArchiveStatsReturn.data = [
            {total_uncompressed_size: 5000, total_compressed_size: 500},
        ];
        render(<SpaceSavings/>, {wrapper: createWrapper()});
        const savings = screen.getAllByText("90.00%");
        expect(savings.length).toBeGreaterThanOrEqual(1);
    });
});
