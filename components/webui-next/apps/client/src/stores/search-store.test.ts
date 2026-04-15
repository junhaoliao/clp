import {act} from "@testing-library/react";
import {
    beforeEach,
    describe,
    expect,
    test,
} from "vitest";

import useSearchStore, {
    SEARCH_STATE_DEFAULT,
    SEARCH_UI_STATE,
    TIME_RANGE_OPTION,
} from "./search-store";


describe("useSearchStore", () => {
    beforeEach(() => {
        // Reset store to default state before each test
        act(() => {
            useSearchStore.setState({...SEARCH_STATE_DEFAULT});
        });
    });

    test("initializes with default state", () => {
        const state = useSearchStore.getState();

        expect(state.searchUiState).toBe(SEARCH_UI_STATE.DEFAULT);
        expect(state.queryString).toBe("");
        expect(state.searchJobId).toBeNull();
        expect(state.aggregationJobId).toBeNull();
        expect(state.queryIsCaseSensitive).toBe(false);
        expect(state.selectedDatasets).toEqual([]);
        expect(state.queriedDatasets).toEqual([]);
        expect(state.numSearchResultsMetadata).toBe(0);
        expect(state.numSearchResultsTable).toBe(0);
        expect(state.numSearchResultsTimeline).toBe(0);
        expect(state.timeRangeOption).toBe(TIME_RANGE_OPTION.ALL_TIME);
    });

    test("updateQueryString updates query string", () => {
        act(() => {
            useSearchStore.getState().updateQueryString("error");
        });
        expect(useSearchStore.getState().queryString).toBe("error");
    });

    test("updateSearchUiState updates UI state", () => {
        act(() => {
            useSearchStore.getState().updateSearchUiState(SEARCH_UI_STATE.QUERYING);
        });
        expect(useSearchStore.getState().searchUiState).toBe(SEARCH_UI_STATE.QUERYING);
    });

    test("updateSearchJobId updates search job ID", () => {
        act(() => {
            useSearchStore.getState().updateSearchJobId("job-123");
        });
        expect(useSearchStore.getState().searchJobId).toBe("job-123");
    });

    test("updateSearchJobId can set to null", () => {
        act(() => {
            useSearchStore.getState().updateSearchJobId("job-123");
        });
        act(() => {
            useSearchStore.getState().updateSearchJobId(null);
        });
        expect(useSearchStore.getState().searchJobId).toBeNull();
    });

    test("updateAggregationJobId updates aggregation job ID", () => {
        act(() => {
            useSearchStore.getState().updateAggregationJobId("agg-456");
        });
        expect(useSearchStore.getState().aggregationJobId).toBe("agg-456");
    });

    test("updateQueryIsCaseSensitive toggles case sensitivity", () => {
        expect(useSearchStore.getState().queryIsCaseSensitive).toBe(false);
        act(() => {
            useSearchStore.getState().updateQueryIsCaseSensitive(true);
        });
        expect(useSearchStore.getState().queryIsCaseSensitive).toBe(true);
    });

    test("updateSelectedDatasets updates selected datasets", () => {
        act(() => {
            useSearchStore.getState().updateSelectedDatasets(["dataset1",
                "dataset2"]);
        });
        expect(useSearchStore.getState().selectedDatasets).toEqual(["dataset1",
            "dataset2"]);
    });

    test("updateQueriedDatasets updates queried datasets", () => {
        act(() => {
            useSearchStore.getState().updateQueriedDatasets(["dataset1"]);
        });
        expect(useSearchStore.getState().queriedDatasets).toEqual(["dataset1"]);
    });

    test("updateNumSearchResultsMetadata updates count", () => {
        act(() => {
            useSearchStore.getState().updateNumSearchResultsMetadata(42);
        });
        expect(useSearchStore.getState().numSearchResultsMetadata).toBe(42);
    });

    test("updateNumSearchResultsTable updates count", () => {
        act(() => {
            useSearchStore.getState().updateNumSearchResultsTable(100);
        });
        expect(useSearchStore.getState().numSearchResultsTable).toBe(100);
    });

    test("updateNumSearchResultsTimeline updates count", () => {
        act(() => {
            useSearchStore.getState().updateNumSearchResultsTimeline(60);
        });
        expect(useSearchStore.getState().numSearchResultsTimeline).toBe(60);
    });

    test("updateTimeRangeOption updates option", () => {
        act(() => {
            useSearchStore.getState().updateTimeRangeOption(TIME_RANGE_OPTION.LAST_15_MINUTES);
        });
        expect(useSearchStore.getState().timeRangeOption).toBe(TIME_RANGE_OPTION.LAST_15_MINUTES);
    });

    test("updateTimelineConfig updates config", () => {
        const config = {
            bucketSize: 5000,
            endTimestamp: new Date() as unknown as import("dayjs").Dayjs,
            startTimestamp: new Date() as unknown as import("dayjs").Dayjs,
        };

        act(() => {
            useSearchStore.getState().updateTimelineConfig(config);
        });
        expect(useSearchStore.getState().timelineConfig).toEqual(config);
    });

    test("multiple updates compose correctly", () => {
        act(() => {
            const state = useSearchStore.getState();
            state.updateQueryString("test query");
            state.updateSearchUiState(SEARCH_UI_STATE.QUERY_ID_PENDING);
            state.updateSelectedDatasets(["default"]);
        });

        const state = useSearchStore.getState();
        expect(state.queryString).toBe("test query");
        expect(state.searchUiState).toBe(SEARCH_UI_STATE.QUERY_ID_PENDING);
        expect(state.selectedDatasets).toEqual(["default"]);
    });
});
