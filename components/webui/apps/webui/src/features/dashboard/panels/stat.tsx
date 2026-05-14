import {
    Minus,
    TrendingDown,
    TrendingUp,
} from "lucide-react";

import type {PanelComponentProps} from "../plugins/registry";


/**
 *
 * @param root0
 * @param root0.data
 * @param root0.options
 * @param root0.width
 * @param root0.height
 */
export const StatPanel = ({data, options, width, height}: PanelComponentProps) => {
    const frame = data[0];

    if (!frame || 0 === frame.length) {
        return (
            <div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>
                No data
            </div>
        );
    }

    const valueField = frame.fields.find((f) => "number" === f.type) ?? frame.fields[0];
    if (!valueField) {
        return (
            <div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>
                No field
            </div>
        );
    }

    const lastValue = valueField.values[valueField.values.length - 1];
    const prefix = (options["prefix"] as string) ?? "";
    const suffix = (options["suffix"] as string) ?? "";
    const decimals = (options["decimals"] as number) ?? 2;
    const color = options["color"] as string | undefined;
    const unit = options["unit"] as string | undefined;
    const showTrend = (options["trendIndicator"] as boolean) ?? true;
    const showSparkline = (options["sparkline"] as boolean) ?? false;

    const formatted = "number" === typeof lastValue ?
        ("bytes" === unit ?
            formatBytes(lastValue) :
            lastValue.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})) :
        String(lastValue);

    const showSuffix = "bytes" !== unit;

    const trend = computeTrend(valueField.values);
    const trendColor = "up" === trend?.direction ?
        "text-green-500" :
        "down" === trend?.direction ?
            "text-red-500" :
            "text-muted-foreground";

    const compact = 120 > width || 80 > height;

    return (
        <div className={"flex flex-col items-center justify-center h-full gap-1"}>
            <span
                className={`font-bold tabular-nums ${compact ?
                    "text-xl" :
                    "text-3xl"}`}
                style={color ?
                    {color} :
                    undefined}
            >
                {prefix}
                {formatted}
                {showSuffix ?
                    suffix :
                    ""}
            </span>
            {showTrend && trend && (
                <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                    {"up" === trend.direction && <TrendingUp className={"size-3"}/>}
                    {"down" === trend.direction && <TrendingDown className={"size-3"}/>}
                    {"flat" === trend.direction && <Minus className={"size-3"}/>}
                    {"flat" !== trend.direction && <span>
                        {trend.percent.toFixed(1)}
                        %
                                                   </span>}
                </div>
            )}
            {showSparkline && 1 < valueField.values.length && (
                <Sparkline
                    height={30}
                    values={valueField.values.filter((v): v is number => "number" === typeof v)}
                    width={Math.min(width - 16, 200)}/>
            )}
            {valueField.config?.displayName && (
                <span className={"text-xs text-muted-foreground"}>
                    {valueField.config.displayName}
                </span>
            )}
        </div>
    );
};

/**
 *
 * @param value
 */
function formatBytes (value: number): string {
    const IEC_UNITS = ["B",
        "KiB",
        "MiB",
        "GiB",
        "TiB",
        "PiB",
        "EiB"];
    const divisor = 1024;
    if (0 === value) {
        return "0 B";
    }
    let unitIdx = 0;
    while (unitIdx < IEC_UNITS.length - 1 && Math.abs(value) >= divisor) {
        value /= divisor;
        ++unitIdx;
    }

    return `${value.toFixed(1)} ${IEC_UNITS[unitIdx]}`;
}

/**
 *
 * @param values
 */
function computeTrend (values: unknown[]): {direction: "up" | "down" | "flat"; percent: number} | null {
    const nums = values.filter((v): v is number => "number" === typeof v);
    if (2 > nums.length) {
        return null;
    }

    const current = nums[nums.length - 1]!;
    const previous = nums[nums.length - 2]!;

    if (0 === previous) {
        return null;
    }

    const percentChange = ((current - previous) / Math.abs(previous)) * 100;

    if (0.1 > Math.abs(percentChange)) {
        return {direction: "flat", percent: 0};
    }
    if (0 < percentChange) {
        return {direction: "up", percent: percentChange};
    }

    return {direction: "down", percent: Math.abs(percentChange)};
}

/**
 *
 * @param root0
 * @param root0.values
 * @param root0.width
 * @param root0.height
 */
const Sparkline = ({values, width, height}: {values: number[]; width: number; height: number}) => {
    if (2 > values.length) {
        return null;
    }

    const min = values.reduce((m, v) => Math.min(m, v), Infinity);
    const max = values.reduce((m, v) => Math.max(m, v), -Infinity);
    const range = max - min || 1;

    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg
            className={"opacity-50"}
            height={height}
            width={width}
        >
            <polyline
                className={"text-primary"}
                fill={"none"}
                points={points}
                stroke={"currentColor"}
                strokeWidth={"1.5"}/>
        </svg>
    );
};
