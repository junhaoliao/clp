import type {PanelComponentProps} from "../plugins/registry";

export function GaugePanel({data, options}: PanelComponentProps) {
  const frame = data[0];

  if (!frame || frame.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No data
      </div>
    );
  }

  const valueField = frame.fields.find((f) => f.type === "number") ?? frame.fields[0];
  const value = valueField?.values[valueField.values.length - 1];
  const min = (options["min"] as number) ?? 0;
  const max = (options["max"] as number) ?? 100;
  const prefix = (options["prefix"] as string) ?? "";
  const suffix = (options["suffix"] as string) ?? "";
  const decimals = (options["decimals"] as number) ?? 1;

  if (typeof value !== "number") {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Not a number
      </div>
    );
  }

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const color = gaugeColor(pct);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <svg viewBox="0 0 120 70" className="w-full max-w-48">
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${pct * 157} 157`}
        />
      </svg>
      <span className="text-2xl font-bold tabular-nums" style={{color}}>
        {prefix}{value.toFixed(decimals)}{suffix}
      </span>
    </div>
  );
}

function gaugeColor(pct: number): string {
  if (pct < 0.3) return "#22c55e";
  if (pct < 0.7) return "#f59e0b";
  return "#ef4444";
}
