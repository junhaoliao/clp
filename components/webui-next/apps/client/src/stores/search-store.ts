import dayjs, {type Dayjs} from "dayjs";
import dayjsDuration from "dayjs/plugin/duration";
import dayjsUtc from "dayjs/plugin/utc";
import {create} from "zustand";


dayjs.extend(dayjsUtc);
dayjs.extend(dayjsDuration);


/**
 * Search UI states.
 */
enum SEARCH_UI_STATE {
    /**
     * Default state when client starts and there is no active query.
     */
    DEFAULT,

    /**
     * When query is submitted, but the server has not yet responded with a query ID.
     */
    QUERY_ID_PENDING,

    /**
     * After the client received the query ID, and the query is being processed on server.
     */
    QUERYING,

    /**
     * When the query is complete or cancelled.
     */
    DONE,

    /**
     * When the query failed due to an error.
     */
    FAILED,
}


/**
 * Time range preset options.
 */
enum TIME_RANGE_OPTION {
    /** Custom user-specified range. */
    CUSTOM = "custom",

    /** Last 15 minutes. */
    LAST_15_MINUTES = "last_15_minutes",

    /** Last 1 hour. */
    LAST_1_HOUR = "last_1_hour",

    /** Last 24 hours. */
    LAST_24_HOURS = "last_24_hours",

    /** Last 7 days. */
    LAST_7_DAYS = "last_7_days",

    /** All time. */
    ALL_TIME = "all_time",
}

interface TimelineConfig {
    bucketSize: number;
    endTimestamp: Dayjs;
    startTimestamp: Dayjs;
}

/**
 * Default time range: all time (epoch to now).
 */
const DEFAULT_TIME_RANGE: [Dayjs, Dayjs] = [
    dayjs(0),
    dayjs(),
];

const DEFAULT_TIME_RANGE_OPTION = TIME_RANGE_OPTION.ALL_TIME;


/**
 * Target number of bars/buckets in the timeline chart.
 */
const MAX_DATA_POINTS_PER_TIMELINE = 40;

/**
 * Predefined "nice" bucket durations, ordered from least to greatest.
 */
const DURATION_SELECTIONS: number[] = [
    /* eslint-disable @stylistic/array-element-newline */
    // seconds
    1, 2, 5, 10, 15, 30,

    // minutes
    60, 120, 300, 600, 900, 1200, 1800,

    // hours
    3600, 7200, 10800, 14400, 28800, 43200,

    // days
    86400, 172800, 432000, 1296000,

    // months (30-day approximation)
    2592000, 5184000, 7776000, 10368000, 15552000,

    // year
    31536000,
    /* eslint-enable @stylistic/array-element-newline */
].map((s) => s * 1000);

/**
 * Computes the timeline bucket configuration from a time range.
 * Uses the same algorithm as the original webui: divides the range by
 * MAX_DATA_POINTS_PER_TIMELINE, then rounds up to the nearest "nice" duration.
 *
 * @param timeRange
 * @return
 */
const computeTimelineConfig = (timeRange: [Dayjs, Dayjs]): TimelineConfig => {
    const [start, end] = timeRange;
    const startMs = start.valueOf();
    const endMs = end.valueOf();
    const rangeMs = endMs - startMs;
    const exactBucketMs = rangeMs / MAX_DATA_POINTS_PER_TIMELINE;

    // Find the smallest predefined duration that is >= exactBucketMs
    let bucketMs = DURATION_SELECTIONS.find((d) => exactBucketMs <= d) ?? 0;
    if (0 === bucketMs) {
        // If larger than 1 year, use multi-year buckets
        const msPerYear = 365 * 24 * 60 * 60 * 1000;
        const years = Math.ceil(exactBucketMs / msPerYear);
        bucketMs = years * msPerYear;
    }

    // Snap time range to clean bucket boundaries
    const alignedStart = startMs - (startMs % bucketMs);
    const alignedEnd = Math.ceil(endMs / bucketMs) * bucketMs;

    return {
        bucketSize: bucketMs,
        endTimestamp: dayjs(alignedEnd),
        startTimestamp: dayjs(alignedStart),
    };
};

/**
 * Default values of the search state.
 */
const SEARCH_STATE_DEFAULT = Object.freeze({
    aggregationJobId: null,
    numSearchResultsMetadata: 0,
    numSearchResultsTable: 0,
    numSearchResultsTimeline: 0,
    queriedDatasets: [] as string[],
    queryIsCaseSensitive: false,
    queryString: "",
    searchJobId: null,
    searchUiState: SEARCH_UI_STATE.DEFAULT,
    selectedDatasets: [] as string[],
    timeRange: DEFAULT_TIME_RANGE,
    timeRangeOption: DEFAULT_TIME_RANGE_OPTION,
    timelineConfig: computeTimelineConfig(DEFAULT_TIME_RANGE),
});

interface SearchState {
    /**
     * Unique ID from the database for the aggregation job.
     */
    aggregationJobId: string | null;

    /**
     * The number of search results from server metadata.
     */
    numSearchResultsMetadata: number;

    /**
     * The number of search table results.
     */
    numSearchResultsTable: number;

    /**
     * The number of timeline results.
     */
    numSearchResultsTimeline: number;

    /**
     * Datasets that were included in the most recently submitted query. Separate from
     * `selectedDatasets` so that post-submission UI changes don't affect in-flight query state.
     */
    queriedDatasets: string[];

    /**
     * Whether the query is case sensitive.
     */
    queryIsCaseSensitive: boolean;

    /**
     * The search query string.
     */
    queryString: string;

    /**
     * Unique ID from the database for the search job.
     */
    searchJobId: string | null;

    /**
     * UI state of search page.
     */
    searchUiState: SEARCH_UI_STATE;

    /**
     * Datasets currently selected in the UI dropdown.
     */
    selectedDatasets: string[];

    /**
     * Time range for search query.
     */
    timeRange: [Dayjs, Dayjs];

    /**
     * Time range preset.
     */
    timeRangeOption: TIME_RANGE_OPTION;

    /**
     * Time range and bucket duration for the timeline.
     */
    timelineConfig: TimelineConfig;

    updateAggregationJobId: (id: string | null) => void;
    updateNumSearchResultsMetadata: (num: number) => void;
    updateNumSearchResultsTable: (num: number) => void;
    updateNumSearchResultsTimeline: (num: number) => void;
    updateQueriedDatasets: (datasets: string[]) => void;
    updateQueryIsCaseSensitive: (newValue: boolean) => void;
    updateQueryString: (query: string) => void;
    updateSearchJobId: (id: string | null) => void;
    updateSearchUiState: (state: SEARCH_UI_STATE) => void;
    updateSelectedDatasets: (datasets: string[]) => void;
    updateTimeRange: (range: [Dayjs, Dayjs]) => void;
    updateTimeRangeOption: (option: TIME_RANGE_OPTION) => void;
    updateTimelineConfig: (config: TimelineConfig) => void;
}

const useSearchStore = create<SearchState>((set) => ({
    ...SEARCH_STATE_DEFAULT,
    updateAggregationJobId: (id) => {
        set({aggregationJobId: id});
    },
    updateNumSearchResultsMetadata: (num) => {
        set({numSearchResultsMetadata: num});
    },
    updateNumSearchResultsTable: (num) => {
        set({numSearchResultsTable: num});
    },
    updateNumSearchResultsTimeline: (num) => {
        set({numSearchResultsTimeline: num});
    },
    updateQueriedDatasets: (datasets) => {
        set({queriedDatasets: datasets});
    },
    updateQueryIsCaseSensitive: (newValue: boolean) => {
        set({queryIsCaseSensitive: newValue});
    },
    updateQueryString: (query) => {
        set({queryString: query});
    },
    updateSearchJobId: (id) => {
        set({searchJobId: id});
    },
    updateSearchUiState: (state) => {
        set({searchUiState: state});
    },
    updateSelectedDatasets: (datasets) => {
        set({selectedDatasets: datasets});
    },
    updateTimeRange: (range) => {
        set({timeRange: range});
    },
    updateTimeRangeOption: (option) => {
        set({timeRangeOption: option});
    },
    updateTimelineConfig: (config) => {
        set({timelineConfig: config});
    },
}));


export {
    computeTimelineConfig,
    DEFAULT_TIME_RANGE,
    DEFAULT_TIME_RANGE_OPTION,
    SEARCH_STATE_DEFAULT,
    SEARCH_UI_STATE,
    TIME_RANGE_OPTION,
};
export default useSearchStore;

export type {TimelineConfig};
