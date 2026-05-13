import type {PanelComponentProps} from "../plugins/registry";
import {TrendingUp, TrendingDown, Minus} from "lucide-react";

export function StatPanel({data, options, width, height}: PanelComponentProps) {
  const frame = data[0];

  if (!frame || frame.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No data
      </div>
    );
  }

  const valueField = frame.fields.find((f) => f.type === "number") ?? frame.fields[0];
  if (!valueField) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
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

  const formatted = typeof lastValue === "number"
    ? ("bytes" === unit ? formatBytes(lastValue) : lastValue.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}))
    : String(lastValue);

  const showSuffix = "bytes" !== unit;

  const trend = computeTrend(valueField.values);
  const trendColor = trend?.direction === "up" ? "text-green-500" : trend?.direction === "down" ? "text-red-500" : "text-muted-foreground";

  const compact = width < 120 || height < 80;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <span
        className={`font-bold tabular-nums ${compact ? "text-xl" : "text-3xl"}`}
        style={color ? {color} : undefined}
      >
        {prefix}{formatted}{showSuffix ? suffix : ""}
      </span>
      {showTrend && trend && (
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          {trend.direction === "up" && <TrendingUp className="size-3" />}
          {trend.direction === "down" && <TrendingDown className="size-3" />}
          {trend.direction === "flat" && <Minus className="size-3" />}
          {trend.direction !== "flat" && <span>{trend.percent.toFixed(1)}%</span>}
        </div>
      )}
      {showSparkline && valueField.values.length > 1 && (
        <Sparkline values={valueField.values.filter((v): v is number => typeof v === "number")} width={Math.min(width - 16, 200)} height={30} />
      )}
      {valueField.config?.displayName && (
        <span className="text-xs text-muted-foreground">{valueField.config.displayName}</span>
      )}
    </div>
  );
}

function formatBytes(value: number): string {
  const IEC_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
  const divisor = 1024;
  if (0 === value) return "0 B";
  let unitIdx = 0;
  while (unitIdx < IEC_UNITS.length - 1 && Math.abs(value) >= divisor) {
    value /= divisor;
    ++unitIdx;
  }
  return `${value.toFixed(1)} ${IEC_UNITS[unitIdx]}`;
}

function computeTrend(values: unknown[]): {direction: "up" | "down" | "flat"; percent: number} | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length < 2) return null;

  const current = nums[nums.length - 1]!;
  const previous = nums[nums.length - 2]!;

  if (previous === 0) return null;

  const percentChange = ((current - previous) / Math.abs(previous)) * 100;

  if (Math.abs(percentChange) < 0.1) return {direction: "flat", percent: 0};
  if (percentChange > 0) return {direction: "up", percent: percentChange};
  return {direction: "down", percent: Math.abs(percentChange)};
}

function Sparkline({values, width, height}: {values: number[]; width: number; height: number}) {
  if (values.length < 2) return null;

  const min = values.reduce((m, v) => Math.min(m, v), Infinity);
  const max = values.reduce((m, v) => Math.max(m, v), -Infinity);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="opacity-50">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary"
      />
    </svg>
  );
}
