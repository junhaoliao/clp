import React from "react";

import {
    act,
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import useSearchStore, {
    SEARCH_STATE_DEFAULT,
    SEARCH_UI_STATE,
} from "../../../stores/search-store";
import {ResultsTimeline} from "./ResultsTimeline";


// ---------------------------------------------------------------------------
// Shared state using globalThis to ensure it's accessible inside vi.mock
// factory (which runs in a separate module scope in vitest 4.x).
// ---------------------------------------------------------------------------

/**
 *
 */
const getCapturedXAxisProps = (): Record<string, unknown> => (globalThis as Record<string, unknown>).__xAxisProps as Record<string, unknown> ?? {};

/**
 *
 */
const getCapturedTooltipContent = (): React.ReactElement | null => (globalThis as Record<string, unknown>).__tooltipContent as React.ReactElement | null ?? null;


// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const {mockUseCursor} = vi.hoisted(() => ({
    mockUseCursor: vi.fn(),
}));

vi.mock("recharts", () => ({
    BarChart: ({data, children}: {data: unknown[]; children?: React.ReactNode}) => (
        <div
            data-length={data?.length}
            data-testid={"bar-chart"}
        >
            {children}
        </div>
    ),
    Bar: () => <div data-testid={"bar"}/>,
    XAxis: (props: Record<string, unknown>) => {
        (globalThis as Record<string, unknown>).__xAxisProps = props;

        return <div data-testid={"x-axis"}/>;
    },
    YAxis: () => <div data-testid={"y-axis"}/>,
    Tooltip: ({content}: {content: React.ReactElement}) => {
        (globalThis as Record<string, unknown>).__tooltipContent = content;

        return (
            <div data-testid={"tooltip"}>
                {content}
            </div>
        );
    },
    ResponsiveContainer: ({children}: {children: React.ReactNode}) => (
        <div data-testid={"responsive-container"}>
            {children}
        </div>
    ),
    CartesianGrid: () => <div data-testid={"cartesian-grid"}/>,
    Brush: ({dataKey, height}: {dataKey: string; height: number}) => (
        <div data-testid={"brush"} data-datakey={dataKey} data-height={height}/>
    ),
}));

vi.mock("../../../hooks/use-cursor", () => ({
    useCursor: (...args: unknown[]) => mockUseCursor(...args),
}));

vi.mock("../../../api/socket/MongoSocketCollection", () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(function (this: unknown, _id: string) {
        return {
            find: vi.fn().mockReturnValue("mock-cursor"),
        };
    }),
}));

vi.mock("../../../components/dashboard/DashboardCard", () => ({
    DashboardCard: ({
        title,
        children,
    }: {
        title: string;
        children?: React.ReactNode;
    }) => (
        <div data-testid={"dashboard-card"}>
            <div data-testid={"dashboard-card-title"}>
                {title}
            </div>
            {children}
        </div>
    ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = Date.now();

/**
 *
 * @param id
 * @param count
 * @param timestamp
 */
const makeBucket = (id: string, count: number, timestamp: number) => ({
    _id: id,
    count,
    timestamp,
});

/**
 *
 * @param uiState
 * @param aggJobId
 * @param cursorData
 */
const setupStoreAndCursor = (
    uiState: SEARCH_UI_STATE,
    aggJobId: string | null,
    cursorData: unknown,
) => {
    act(() => {
        useSearchStore.setState({
            searchUiState: uiState,
            aggregationJobId: aggJobId,
        });
    });
    mockUseCursor.mockReturnValue(cursorData);
};

/**
 * Invoke the captured CustomTooltip component element with given props.
 *
 * @param props
 * @param props.active
 * @param props.payload
 */
const invokeCustomTooltip = (props: {
    active?: boolean;
    payload?: Array<{payload: {timestamp: number; count: number}}>;
}) => {
    const content = getCapturedTooltipContent();
    if (!content) {
        return null;
    }
    const Component = content.type as React.FC<typeof props>;
    return Component({...content.props as typeof props, ...props});
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ResultsTimeline", () => {
    beforeEach(() => {
        cleanup();
        mockUseCursor.mockReturnValue(null);
        (globalThis as Record<string, unknown>).__xAxisProps = {};
        (globalThis as Record<string, unknown>).__tooltipContent = null;
        act(() => {
            useSearchStore.setState({...SEARCH_STATE_DEFAULT});
        });
    });

    afterEach(() => {
        cleanup();
    });

    // ----- Empty / loading states -----

    it("shows loading message when querying and no data yet", () => {
        setupStoreAndCursor(SEARCH_UI_STATE.QUERYING, "agg-1", null);
        render(<ResultsTimeline/>);
        expect(screen.getByText("Loading timeline...")).toBeDefined();
    });

    it("shows loading message when QUERY_ID_PENDING and no data yet", () => {
        setupStoreAndCursor(SEARCH_UI_STATE.QUERY_ID_PENDING, "agg-1", null);
        render(<ResultsTimeline/>);
        expect(screen.getByText("Loading timeline...")).toBeDefined();
    });

    it("shows 'No timeline data available' when data is null and not querying", () => {
        setupStoreAndCursor(SEARCH_UI_STATE.DEFAULT, null, null);
        render(<ResultsTimeline/>);
        expect(screen.getByText("No timeline data available.")).toBeDefined();
    });

    it("shows 'No timeline data available' when data is an empty array", () => {
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", []);
        render(<ResultsTimeline/>);
        expect(screen.getByText("No timeline data available.")).toBeDefined();
    });

    // ----- Populated state -----

    it("renders timeline data with correct result count and bucket count", () => {
        const buckets = [
            makeBucket("b1", 10, NOW - 5000),
            makeBucket("b2", 20, NOW - 2500),
            makeBucket("b3", 5, NOW),
        ];

        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);
        expect(screen.getByText("35 results across 3 time buckets")).toBeDefined();
    });

    it("renders chart components when data is present", () => {
        const buckets = [makeBucket("b1", 10, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);
        expect(screen.getByTestId("bar-chart")).toBeDefined();
        expect(screen.getByTestId("responsive-container")).toBeDefined();
    });

    it("renders DashboardCard with title 'Results Timeline'", () => {
        mockUseCursor.mockReturnValue(null);
        render(<ResultsTimeline/>);
        expect(screen.getByText("Results Timeline")).toBeDefined();
    });

    it("does not show loading when querying but data has already arrived", () => {
        const buckets = [makeBucket("b1", 10, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.QUERYING, "agg-1", buckets);
        render(<ResultsTimeline/>);
        expect(screen.queryByText("Loading timeline...")).toBeNull();
        expect(screen.getByTestId("bar-chart")).toBeDefined();
    });

    it("computes total results correctly with a single bucket", () => {
        const buckets = [makeBucket("b1", 42, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);
        expect(screen.getByText("42 results across 1 time buckets")).toBeDefined();
    });

    it("shows zero results with zero-count buckets", () => {
        const buckets = [makeBucket("b1", 0, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);
        expect(screen.getByText("0 results across 1 time buckets")).toBeDefined();
    });

    // ----- Brush for timeline zoom -----

    it("renders Brush for timeline zoom when data is present", () => {
        const buckets = [makeBucket("b1", 10, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);
        expect(screen.getByTestId("brush")).toBeDefined();
        expect(screen.getByTestId("brush").getAttribute("data-datakey")).toBe("timestamp");
    });

    // ----- formatTimestamp via XAxis tickFormatter (covers line 29) -----

    it("passes formatTimestamp as tickFormatter to XAxis", () => {
        const buckets = [makeBucket("b1", 10, 1704067200000)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        expect(getCapturedXAxisProps().tickFormatter).toBeTypeOf("function");
    });

    it("formatTimestamp formats timestamp to HH:mm:ss in UTC", () => {
        const buckets = [makeBucket("b1", 10, 1704067200000)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        const formatter = getCapturedXAxisProps()
            .tickFormatter as (ts: number) => string;


        // 1704067200000 = 2024-01-01T00:00:00Z
        expect(formatter(1704067200000)).toBe("00:00:00");
    });

    it("formatTimestamp formats a non-zero time correctly", () => {
        const buckets = [makeBucket("b1", 5, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        const formatter = getCapturedXAxisProps()
            .tickFormatter as (ts: number) => string;

        // Verify it returns a string in HH:mm:ss format
        const result = formatter(1704108600000);
        expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it("formatTimestamp shows full date when range spans years", () => {
        // Two buckets spanning from epoch to 2023
        const buckets = [
            makeBucket("b1", 10, 0),
            makeBucket("b2", 20, 1679877135936),
        ];

        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        const formatter = getCapturedXAxisProps()
            .tickFormatter as (ts: number) => string;

        const result = formatter(1679877135936);
        // Should show full date (YYYY-MMM-DD) since range > 1 year
        expect(result).toMatch(/\d{4}-[A-Z][a-z]{2}-\d{1,2}/);
    });

    it("formatTimestamp shows date+time when range spans days", () => {
        const dayMs = 24 * 3600 * 1000;
        const buckets = [
            makeBucket("b1", 10, NOW - 3 * dayMs),
            makeBucket("b2", 20, NOW),
        ];

        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        const formatter = getCapturedXAxisProps()
            .tickFormatter as (ts: number) => string;

        const result = formatter(NOW);
        // Should show "Mon D, HH:mm" format since range > 1 day
        expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{2}:\d{2}/);
    });

    // ----- formatDateLabel via CustomTooltip (covers line 33) -----

    it("CustomTooltip renders date label and event count for active tooltip", () => {
        const ts = 1704067200000; // 2024-01-01T00:00:00Z
        const buckets = [makeBucket("b1", 42, ts)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        const result = invokeCustomTooltip({
            active: true,
            payload: [{payload: {timestamp: ts, count: 42}}],
        });

        expect(result).not.toBeNull();
        const {container} = render(
            <>
                {result}
            </>
        );

        // formatDateLabel(1704067200000) in UTC = "2024-Jan-01 00:00:00"
        expect(container.textContent).toContain("2024-Jan-01 00:00:00");
        expect(container.textContent).toContain("42 events");
    });

    it("CustomTooltip returns null when not active", () => {
        const buckets = [makeBucket("b1", 5, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        expect(invokeCustomTooltip({
            active: false,
            payload: [{payload: {timestamp: NOW, count: 5}}],
        })).toBeNull();
    });

    it("CustomTooltip returns null when payload is empty", () => {
        const buckets = [makeBucket("b1", 5, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        expect(invokeCustomTooltip({
            active: true,
            payload: [],
        })).toBeNull();
    });

    it("CustomTooltip returns null when active is undefined", () => {
        const buckets = [makeBucket("b1", 5, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        expect(invokeCustomTooltip({
            payload: [{payload: {timestamp: NOW, count: 5}}],
        })).toBeNull();
    });

    it("CustomTooltip returns null when payload is undefined", () => {
        const buckets = [makeBucket("b1", 5, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        expect(invokeCustomTooltip({
            active: true,
        })).toBeNull();
    });

    it("CustomTooltip returns null when payload entry has no nested payload", () => {
        const buckets = [makeBucket("b1", 5, NOW)];
        setupStoreAndCursor(SEARCH_UI_STATE.DONE, "agg-1", buckets);
        render(<ResultsTimeline/>);

        expect(invokeCustomTooltip({
            active: true,
            payload: [{} as {payload: {timestamp: number; count: number}}],
        })).toBeNull();
    });

    // ----- useCursor callback branches (covers lines 78-84) -----

    it("useCursor factory returns null when aggregationJobId is null", () => {
        setupStoreAndCursor(SEARCH_UI_STATE.DEFAULT, null, null);

        const capturedFactory = vi.fn((_factory: () => unknown) => null);
        mockUseCursor.mockImplementation(capturedFactory);

        render(<ResultsTimeline/>);

        expect(capturedFactory).toHaveBeenCalled();
        const factory = capturedFactory.mock.calls[0]![0] as () => unknown;
        expect(factory()).toBeNull();
    });

    it("useCursor factory creates MongoSocketCollection when aggregationJobId is set", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                aggregationJobId: "agg-test-789",
            });
        });

        const capturedFactory = vi.fn((_factory: () => unknown) => null);
        mockUseCursor.mockImplementation(capturedFactory);

        render(<ResultsTimeline/>);

        expect(capturedFactory).toHaveBeenCalled();
        const factory = capturedFactory.mock.calls[0]![0] as () => unknown;
        const result = factory();

        // The factory creates MongoSocketCollection("agg-test-789") and calls find()
        // Our mock returns "mock-cursor" from find()
        expect(result).toBe("mock-cursor");
    });
});
