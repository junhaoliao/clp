import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
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
const PIE_RADIUS_DIVISOR = 4;

/**
 * @param root0
 * @param root0.data
 * @param root0.width
 * @param root0.height
 * @param root0.options
 * @param root0.syncId
 */
export const PieChartPanel = ({data, width, height, id, options, syncId}: PanelComponentProps) => {
    const emit = useEmitPanelEvent(id);
    const chartData = toRechartsData(data);
    const [frame] = data;

    if (!frame || 0 === frame.length) {
        return <EmptyState message={"No data"}/>;
    }

    const [nameField] = frame.fields;
    const valueField = frame.fields.find((f) => "number" === f.type);

    if (!nameField || !valueField) {
        return <EmptyState message={"No numeric field"}/>;
    }

    const noAnimation = chartData.length > LARGE_DATASET_THRESHOLD;

    return (
        <ResponsiveContainer
            height={height - CHART_HEADER_OFFSET}
            width={"100%"}
        >
            <PieChart {...(syncId ? {syncId} : {})}>
                <Pie
                    cx={"50%"}
                    cy={"50%"}
                    data={chartData}
                    dataKey={valueField.name}
                    isAnimationActive={!noAnimation}
                    nameKey={nameField.name}
                    outerRadius={Math.min(width, height) / PIE_RADIUS_DIVISOR}
                    onClick={(payload) => {
                        if (payload?.name !== undefined) {
                            emit("filter-click", {field: nameField.name, value: payload.name});
                        }
                    }}
                >
                    {chartData.map((_, i) => {
                        const color = CHART_COLORS[i % CHART_COLORS.length];

                        return (
                            // eslint-disable-next-line @typescript-eslint/no-deprecated
                            <Cell
                                fill={color ?? "#3b82f6"}
                                key={i}/>
                        );
                    })}
                </Pie>
                <Tooltip/>
                {false !== (options["showLegend"] as boolean) && <Legend/>}
            </PieChart>
        </ResponsiveContainer>
    );
};
