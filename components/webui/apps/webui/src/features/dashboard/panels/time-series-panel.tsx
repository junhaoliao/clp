import {
    Brush,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ReferenceArea,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import type {PanelComponentProps} from "../plugins/registry";
import {useEmitPanelEvent} from "../hooks/use-panel-events";
import {
    CHART_COLORS,
    EmptyState,
    LARGE_DATASET_THRESHOLD,
    toRechartsData,
} from "./charts-shared";


const CHART_HEADER_OFFSET = 40;
const BRUSH_MIN_POINTS = 5;

/**
 *
 * @param xField
 * @param xField.name
 * @param xField.type
 */
function formatTick (xField: {name: string; type: string}) {
    return (v: unknown) => {
        if ("time" === xField.type && "number" === typeof v) {
            return new Date(v).toLocaleTimeString();
        }

        return String(v);
    };
}

/**
 *
 * @param xField
 * @param xField.values
 * @param onTimeRangeChange
 */
function handleBrush (
    xField: {values: unknown[]},
    onTimeRangeChange?: (from: number, to: number) => void,
) {
    return (range: unknown) => {
        if (!onTimeRangeChange) {
            return;
        }
        const {startIndex, endIndex} = range as {startIndex?: number; endIndex?: number};
        if ("number" !== typeof startIndex || "number" !== typeof endIndex) {
            return;
        }
        const [fromVal, toVal] = [xField.values[startIndex],
            xField.values[endIndex]];

        if ("number" === typeof fromVal && "number" === typeof toVal) {
            onTimeRangeChange(fromVal, toVal);
        }
    };
}

/**
 *
 * @param payload
 * @param xFieldName
 * @param emit
 */
function handleChartClick (
    payload: unknown,
    xFieldName: string,
    emit: (type: string, payload: Record<string, unknown>) => void,
) {
    const p = payload as Record<string, unknown> | null;
    if (!p) return;
    const active = p["activePayload"] as {payload: Record<string, unknown>}[] | undefined;
    if (active?.[0]) {
        const point = active[0].payload;
        emit("filter-click", {field: xFieldName, value: point[xFieldName]});
    }
}

const DEFAULT_ANNOTATION_COLOR = "#f59e0b";

/**
 * @param xField
 * @param xField.name
 * @param xField.type
 */
/* eslint-disable react/display-name */
/**
 *
 * @param xField
 * @param xField.name
 * @param xField.type
 */
function renderAnnotation (xField: {name: string; type: string}) {
    return (ann: {
        id: string;
        time: number;
        timeEnd?: number;
        title: string;
        tags?: string[];
        color?: string;
    }) => {
        if (ann.timeEnd && "time" === xField.type) {
            return (
                <ReferenceArea
                    fill={ann.color ?? DEFAULT_ANNOTATION_COLOR}
                    fillOpacity={0.15}
                    key={ann.id}
                    stroke={ann.color ?? DEFAULT_ANNOTATION_COLOR}
                    x1={ann.time}
                    x2={ann.timeEnd}
                    label={{
                        value: ann.title,
                        position: "insideTop",
                        fontSize: 10,
                        fill: ann.color ?? DEFAULT_ANNOTATION_COLOR,
                    }}/>
            );
        }

        if ("time" === xField.type) {
            return (
                <ReferenceArea
                    fillOpacity={0}
                    key={ann.id}
                    stroke={ann.color ?? DEFAULT_ANNOTATION_COLOR}
                    x1={ann.time}
                    x2={ann.time}
                    label={{
                        value: ann.title,
                        position: "top",
                        fontSize: 10,
                        fill: ann.color ?? DEFAULT_ANNOTATION_COLOR,
                    }}/>
            );
        }

        return null;
    };
}
/* eslint-enable react/display-name */

/**
 * @param root0
 * @param root0.data
 * @param root0.height
 * @param root0.options
 * @param root0.onTimeRangeChange
 * @param root0.annotations
 * @param root0.syncId
 */
export const TimeSeriesPanel = ({
    data,
    height,
    id,
    options,
    onTimeRangeChange,
    annotations,
    syncId,
}: PanelComponentProps) => {
    const emit = useEmitPanelEvent(id);
    const chartData = toRechartsData(data);
    const [frame] = data;

    if (!frame || 0 === frame.length || !frame.fields[0]) {
        return <EmptyState message={"No data"}/>;
    }

    const [xField] = frame.fields;
    const yFields = frame.fields.slice(1).filter((f) => "number" === f.type);

    if (0 === yFields.length) {
        return <EmptyState message={"No numeric fields to plot"}/>;
    }

    const noAnimation = chartData.length > LARGE_DATASET_THRESHOLD;

    return (
        <ResponsiveContainer
            height={height - CHART_HEADER_OFFSET}
            width={"100%"}
        >
            <LineChart
                data={chartData}
                onClick={(payload) => handleChartClick(payload, xField.name, emit)}
                {...(syncId ? {syncId} : {})}
            >
                <CartesianGrid
                    stroke={"var(--color-border)"}
                    strokeDasharray={"3 3"}/>
                <XAxis
                    dataKey={xField.name}
                    fontSize={11}
                    stroke={"var(--color-muted-foreground)"}
                    tickFormatter={(v: unknown) => {
                        if ("time" === xField.type && "number" === typeof v) {
                            return new Date(v).toLocaleTimeString();
                        }

                        return String(v);
                    }}/>
                <YAxis
                    fontSize={11}
                    stroke={"var(--color-muted-foreground)"}/>
                <Tooltip/>
                {false !== (options["showLegend"] as boolean) && <Legend/>}
                {yFields.map((field, i) => {
                    const color = CHART_COLORS[i % CHART_COLORS.length];

                    return (
                        <Line
                            dataKey={field.name}
                            dot={false}
                            isAnimationActive={!noAnimation}
                            key={field.name}
                            stroke={color!}
                            strokeWidth={1.5}
                            type={"monotone"}/>
                    );
                })}
                {chartData.length > BRUSH_MIN_POINTS && (
                    <Brush
                        dataKey={xField.name}
                        height={20}
                        stroke={"var(--color-primary)"}
                        tickFormatter={formatTick(xField)}
                        onChange={handleBrush(xField, onTimeRangeChange)}/>
                )}
                {annotations?.map(renderAnnotation(xField)) ?? []}
            </LineChart>
        </ResponsiveContainer>
    );
};
