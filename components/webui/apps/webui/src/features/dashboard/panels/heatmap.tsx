import type {PanelComponentProps} from "../plugins/registry";

export function HeatmapPanel({data, width, height, options}: PanelComponentProps) {
  const frame = data[0];

  if (!frame || frame.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No data
      </div>
    );
  }

  const xField = frame.fields[0];
  const yField = frame.fields[1];
  const valueField = frame.fields.find((f) => f.type === "number");

  if (!xField || !yField || !valueField) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Need x, y, and value fields
      </div>
    );
  }

  const maxVal = Math.max(...(valueField.values as number[]), 1);
  const cellSize = (options["cellSize"] as number) ?? 12;
  const gap = 1;

  return (
    <div className="overflow-auto h-full">
      <svg
        width={Math.max(width, xField.values.length * (cellSize + gap))}
        height={Math.max(height, yField.values.length * (cellSize + gap))}
      >
        {valueField.values.map((val, i) => {
          const xIdx = i % xField.values.length;
          const yIdx = Math.floor(i / xField.values.length) % yField.values.length;
          const intensity = typeof val === "number" ? val / maxVal : 0;
          return (
            <rect
              key={i}
              x={xIdx * (cellSize + gap)}
              y={yIdx * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              fill={heatColor(intensity)}
              rx={1}
            />
          );
        })}
      </svg>
    </div>
  );
}

function heatColor(intensity: number): string {
  const r = Math.round(59 + intensity * 196);
  const g = Math.round(130 - intensity * 80);
  const b = Math.round(246 - intensity * 200);
  return `rgb(${r},${g},${b})`;
}
