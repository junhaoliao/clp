import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
    Bar,
    BarChart,
    Brush,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import MongoSocketCollection from "../../../api/socket/MongoSocketCollection";
import {DashboardCard} from "../../../components/dashboard/DashboardCard";
import {useCursor} from "../../../hooks/use-cursor";
import useSearchStore, {SEARCH_UI_STATE} from "../../../stores/search-store";


dayjs.extend(utc);

/**
 * Constants for time range calculations.
 */
const DAYS_PER_YEAR = 366;
const HOURS_PER_DAY = 24;
const SECONDS_PER_HOUR = 3600;
const MS_PER_SECOND = 1000;

/**
 * Time range thresholds in milliseconds.
 */
const ONE_YEAR_MS = DAYS_PER_YEAR * HOURS_PER_DAY * SECONDS_PER_HOUR * MS_PER_SECOND;
const ONE_DAY_MS = HOURS_PER_DAY * SECONDS_PER_HOUR * MS_PER_SECOND;


interface TimelineBucket {
    _id: string;
    count: number;
    timestamp: number;
}


/**
 * Formats a timestamp for the X-axis, choosing the right granularity
 * based on the overall time range of the data.
 *
 * @param ts
 * @param rangeMs
 * @return
 */
const formatTimestamp = (ts: number, rangeMs: number): string => {
    if (rangeMs > ONE_YEAR_MS) {
        // More than a year — show full date
        return dayjs.utc(ts).format("YYYY-MMM-DD");
    }
    if (rangeMs > ONE_DAY_MS) {
        // More than a day — show date + time
        return dayjs.utc(ts).format("MMM D, HH:mm");
    }

    // Less than a day — show time only
    return dayjs.utc(ts).format("HH:mm:ss");
};

/**
 * Formats a timestamp for tooltip display with full detail.
 *
 * @param ts
 * @return
 */
const formatDateLabel = (ts: number): string => {
    return dayjs.utc(ts).format("YYYY-MMM-DD HH:mm:ss");
};

/**
 *
 * @param root0
 * @param root0.active
 * @param root0.payload
 */
const CustomTooltip = ({

    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{payload: TimelineBucket}>;
}) => {
    if (!active || !payload?.length) {
        return null;
    }

    const bucket = payload[0]?.payload;

    if (!bucket) {
        return null;
    }

    return (
        <div className={"rounded-md border bg-background px-3 py-2 text-sm shadow-md"}>
            <p className={"font-medium"}>
                {formatDateLabel(bucket.timestamp)}
            </p>
            <p className={"text-muted-foreground"}>
                {bucket.count}
                {" "}
                events
            </p>
        </div>
    );
};


/**
 * Renders the appropriate timeline content based on loading/data state.
 *
 * @param params
 * @param params.isQuerying
 * @param params.timelineData
 * @param params.totalResults
 * @param params.tickFormatter
 */
const renderTimelineContent = ({
    isQuerying,
    tickFormatter,
    timelineData,
    totalResults,
}: {
    isQuerying: boolean;
    tickFormatter: (ts: number) => string;
    timelineData: TimelineBucket[] | null;
    totalResults: number;
}) => {
    if (isQuerying && null === timelineData) {
        return (
            <div className={"py-4 text-center text-sm text-muted-foreground"}>
                Loading timeline...
            </div>
        );
    }

    if (null === timelineData || 0 === timelineData.length) {
        return (
            <div className={"py-4 text-center text-sm text-muted-foreground"}>
                No timeline data available.
            </div>
        );
    }

    return (
        <div>
            <div className={"mb-2 text-sm text-muted-foreground"}>
                {`${totalResults} results across ${timelineData.length} time buckets`}
            </div>
            <ResponsiveContainer
                className={"w-full"}
                height={160}
                width={"100%"}
            >
                <BarChart
                    data={timelineData}
                    maxBarSize={8}
                >
                    <CartesianGrid
                        strokeDasharray={"3 3"}
                        vertical={false}/>
                    <XAxis
                        dataKey={"timestamp"}
                        tick={{fontSize: 11}}
                        tickFormatter={tickFormatter}
                        tickLine={false}
                        type={"number"}
                        domain={["dataMin",
                            "dataMax"]}/>
                    <YAxis
                        allowDecimals={false}
                        tick={{fontSize: 11}}
                        width={40}/>
                    <Tooltip
                        content={<CustomTooltip/>}
                        cursor={{fill: "oklch(0.97 0 0 / 0.5)"}}/>
                    <Bar
                        animationDuration={100}
                        dataKey={"count"}
                        fill={"oklch(0.55 0.18 250)"}
                        isAnimationActive={true}
                        radius={[2,
                            2,
                            0,
                            0]}/>
                    <Brush
                        dataKey={"timestamp"}
                        height={30}
                        stroke={"hsl(var(--primary))"}
                        tickFormatter={tickFormatter}/>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};


/**
 * Displays a bar chart timeline of search result counts over time
 * using Recharts.
 *
 * @return
 */
const ResultsTimeline = () => {
    const {
        aggregationJobId,
        searchUiState,
    } = useSearchStore();

    const isQuerying = searchUiState === SEARCH_UI_STATE.QUERY_ID_PENDING ||
        searchUiState === SEARCH_UI_STATE.QUERYING;

    const timelineData = useCursor<TimelineBucket>(() => {
        if (null === aggregationJobId) {
            return null;
        }

        const collection = new MongoSocketCollection(aggregationJobId);

        return collection.find({}, {});
    }, [aggregationJobId]);

    const totalResults = timelineData?.reduce((sum, b) => sum + b.count, 0) ?? 0;

    // Compute the time range for adaptive formatting
    let rangeMs = 0;
    if (timelineData && 0 < timelineData.length) {
        const timestamps = timelineData.map((b) => b.timestamp);
        const minTs = Math.min(...timestamps);
        const maxTs = Math.max(...timestamps);
        rangeMs = maxTs - minTs;
    }

    const tickFormatter = (ts: number) => formatTimestamp(ts, rangeMs);

    return (
        <DashboardCard title={"Results Timeline"}>
            {renderTimelineContent({
                isQuerying,
                tickFormatter,
                timelineData,
                totalResults,
            })}
        </DashboardCard>
    );
};


export {ResultsTimeline};
