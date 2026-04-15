import React from "react";

import {
    act,
    cleanup,
    renderHook,
} from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";

import MongoSocketCollection from "../api/socket/MongoSocketCollection";
import useSearchStore, {SEARCH_STATE_DEFAULT} from "../stores/search-store";
import {useResultsMetadata} from "./use-results-metadata";


// Mock useCursor
const mockUseCursor = vi.fn();
vi.mock("./use-cursor", () => ({
    useCursor: (...args: unknown[]) => mockUseCursor(...args),
}));

// Mock MongoSocketCollection as a constructor
vi.mock("../api/socket/MongoSocketCollection", () => {
    return {
        __esModule: true,
        default: vi.fn().mockImplementation(function (this: unknown) {
            return {
                find: vi.fn().mockReturnValue("mock-cursor"),
            };
        }),
    };
});

// Mock settings
vi.mock("../settings", () => ({
    settings: {
        MongoDbSearchResultsMetadataCollectionName: "results-metadata",
    },
}));


describe("useResultsMetadata", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseCursor.mockReturnValue(null);
        act(() => {
            useSearchStore.setState({...SEARCH_STATE_DEFAULT});
        });
    });

    afterEach(() => {
        cleanup();
    });

    test("returns null when searchJobId is the default (null)", () => {
        const {result} = renderHook(() => useResultsMetadata());
        expect(result.current).toBeNull();
    });

    test("returns null when useCursor returns null", () => {
        act(() => {
            useSearchStore.setState({searchJobId: "job-123"});
        });

        const {result} = renderHook(() => useResultsMetadata());
        expect(result.current).toBeNull();
    });

    test("returns null when useCursor returns empty array", () => {
        act(() => {
            useSearchStore.setState({searchJobId: "job-123"});
        });
        mockUseCursor.mockReturnValue([]);

        const {result} = renderHook(() => useResultsMetadata());
        expect(result.current).toBeNull();
    });

    test("returns metadata document when useCursor returns a single-element array", () => {
        const metadata = {
            _id: "job-123",
            lastSignal: 1,
            numTotalResults: 42,
        };

        act(() => {
            useSearchStore.setState({searchJobId: "job-123"});
        });
        mockUseCursor.mockReturnValue([metadata]);

        const {result} = renderHook(() => useResultsMetadata());
        expect(result.current).toEqual(metadata);
    });

    test("factory returns null when searchJobId is default", () => {
        const {result} = renderHook(() => useResultsMetadata());
        expect(result.current).toBeNull();

        // Get the factory function passed to useCursor
        const factory = mockUseCursor.mock.calls[0]![0] as () => unknown;
        const factoryResult = factory();
        expect(factoryResult).toBeNull();
    });

    test("factory creates collection and calls find with searchJobId", () => {
        act(() => {
            useSearchStore.setState({searchJobId: "job-789"});
        });

        renderHook(() => useResultsMetadata());

        const factory = mockUseCursor.mock.calls[0]![0] as () => unknown;
        factory();

        expect(MongoSocketCollection).toHaveBeenCalledWith("results-metadata");
    });

    test("returns null when resultsMetadata is undefined in single-element array", () => {
        act(() => {
            useSearchStore.setState({searchJobId: "job-123"});
        });
        mockUseCursor.mockReturnValue([undefined]);

        const {result} = renderHook(() => useResultsMetadata());
        expect(result.current).toBeNull();
    });
});
