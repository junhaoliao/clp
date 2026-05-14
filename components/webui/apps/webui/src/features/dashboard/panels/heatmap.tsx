import type {PanelComponentProps} from "../plugins/registry";


/**
 *
 * @param root0
 * @param root0.data
 * @param root0.width
 * @param root0.height
 * @param root0.options
 */
export const HeatmapPanel = ({data, width, height, options}: PanelComponentProps) => {
    const frame = data[0];

    if (!frame || 0 === frame.length) {
        return (
            <div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>
                No data
            </div>
        );
    }

    const xField = frame.fields[0];
    const yField = frame.fields[1];
    const valueField = frame.fields.find((f) => "number" === f.type);

    if (!xField || !yField || !valueField) {
        return (
            <div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>
                Need x, y, and value fields
            </div>
        );
    }

    const numericValues = valueField.values.filter((v): v is number => "number" === typeof v);
    const maxVal = numericValues.reduce((max, v) => Math.max(max, v), 0) || 1;
    const cellSize = (options["cellSize"] as number) ?? 12;
    const gap = 1;

    return (
        <div className={"overflow-auto h-full"}>
            <svg
                height={Math.max(height, yField.values.length * (cellSize + gap))}
                width={Math.max(width, xField.values.length * (cellSize + gap))}
            >
                {valueField.values.map((val, i) => {
                    const xIdx = i % xField.values.length;
                    const yIdx = Math.floor(i / xField.values.length) % yField.values.length;
                    const intensity = "number" === typeof val ?
                        val / maxVal :
                        0;

                    return (
                        <rect
                            fill={heatColor(intensity)}
                            height={cellSize}
                            key={i}
                            rx={1}
                            width={cellSize}
                            x={xIdx * (cellSize + gap)}
                            y={yIdx * (cellSize + gap)}/>
                    );
                })}
            </svg>
        </div>
    );
};

/**
 *
 * @param intensity
 */
function heatColor (intensity: number): string {
    const r = Math.round(59 + intensity * 196);
    const g = Math.round(130 - intensity * 80);
    const b = Math.round(246 - intensity * 200);
    return `rgb(${r},${g},${b})`;
}
