import {QUERY_LIMITS} from "@webui/datasource/types";

import type {PanelComponentProps} from "../plugins/registry";


const CHART_COLORS = [
    "#3b82f6",
    "#ef4444",
    "#22c55e",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#14b8a6",
];

const LARGE_DATASET_THRESHOLD = 500;

/**
 *
 * @param data
 * @param fieldIdx
 */
function getFieldValues (data: PanelComponentProps["data"], fieldIdx: number): unknown[] {
    const [frame] = data;
    if (!frame) {
        return [];
    }

    return frame.fields[fieldIdx]?.values ?? [];
}

/**
 *
 * @param data
 */
function toRechartsData (data: PanelComponentProps["data"]): Record<string, unknown>[] {
    const [frame] = data;
    if (!frame || 0 === frame.length) {
        return [];
    }

    const xValues = getFieldValues(data, 0);
    const limit = Math.min(xValues.length, QUERY_LIMITS.MAX_DISPLAY_ROWS);
    const result: Record<string, unknown>[] = [];

    for (let i = 0; i < limit; i++) {
        const point: Record<string, unknown> = {};
        for (const field of frame.fields) {
            point[field.name] = field.values[i];
        }
        result.push(point);
    }

    return result;
}

/**
 *
 * @param root0
 * @param root0.message
 */
const EmptyState = ({message}: {message: string}) => {
    return (
        <div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>
            {message}
        </div>
    );
};

export {
    CHART_COLORS,
    EmptyState,
    LARGE_DATASET_THRESHOLD,
    toRechartsData,
};
