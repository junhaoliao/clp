import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import {useEmitPanelEvent} from "../hooks/use-panel-events";
import type {PanelComponentProps} from "../plugins/registry";
import {
    CHART_COLORS,
    EmptyState,
    LARGE_DATASET_THRESHOLD,
    toRechartsData,
} from "./charts-shared";


const CHART_HEADER_OFFSET = 40;

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
    if (!p) {
        return;
    }
    const active = p["activePayload"] as {payload: Record<string, unknown>}[] | undefined;
    if (active?.[0]) {
        const point = active[0].payload;
        emit("filter-click", {field: xFieldName, value: point[xFieldName]});
    }
}

/**
 * @param root0
 * @param root0.data
 * @param root0.height
 * @param root0.options
 * @param root0.syncId
 * @param root0.id
 */
export const BarChartPanel = ({data, height, id, options, syncId}: PanelComponentProps) => {
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
            <BarChart
                data={chartData}
                onClick={(payload) => {
                    handleChartClick(payload, xField.name, emit);
                }}
                {...(syncId ?
                    {syncId} :
                    {})}
            >
                <CartesianGrid
                    stroke={"var(--color-border)"}
                    strokeDasharray={"3 3"}/>
                <XAxis
                    dataKey={xField.name}
                    fontSize={11}
                    stroke={"var(--color-muted-foreground)"}/>
                <YAxis
                    fontSize={11}
                    stroke={"var(--color-muted-foreground)"}/>
                <Tooltip/>
                {false !== (options["showLegend"] as boolean) && <Legend/>}
                {yFields.map((field, i) => {
                    const color = CHART_COLORS[i % CHART_COLORS.length];

                    return (
                        <Bar
                            dataKey={field.name}
                            fill={color}
                            isAnimationActive={!noAnimation}
                            key={field.name}/>
                    );
                })}
            </BarChart>
        </ResponsiveContainer>
    );
};
