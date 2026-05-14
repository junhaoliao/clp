import type {PanelComponentProps} from "../plugins/registry";


/**
 *
 * @param root0
 * @param root0.data
 * @param root0.options
 */
export const GaugePanel = ({data, options}: PanelComponentProps) => {
    const frame = data[0];

    if (!frame || 0 === frame.length) {
        return (
            <div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>
                No data
            </div>
        );
    }

    const valueField = frame.fields.find((f) => "number" === f.type) ?? frame.fields[0];
    const value = valueField?.values[valueField.values.length - 1];
    const min = (options["min"] as number) ?? 0;
    const max = (options["max"] as number) ?? 100;
    const prefix = (options["prefix"] as string) ?? "";
    const suffix = (options["suffix"] as string) ?? "";
    const decimals = (options["decimals"] as number) ?? 1;

    if ("number" !== typeof value) {
        return (
            <div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>
                Not a number
            </div>
        );
    }

    const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const color = gaugeColor(pct);

    return (
        <div className={"flex flex-col items-center justify-center h-full gap-2"}>
            <svg
                className={"w-full max-w-48"}
                viewBox={"0 0 120 70"}
            >
                <path
                    d={"M 10 60 A 50 50 0 0 1 110 60"}
                    fill={"none"}
                    stroke={"var(--color-muted)"}
                    strokeLinecap={"round"}
                    strokeWidth={"10"}/>
                <path
                    d={"M 10 60 A 50 50 0 0 1 110 60"}
                    fill={"none"}
                    stroke={color}
                    strokeDasharray={`${pct * 157} 157`}
                    strokeLinecap={"round"}
                    strokeWidth={"10"}/>
            </svg>
            <span
                className={"text-2xl font-bold tabular-nums"}
                style={{color}}
            >
                {prefix}
                {value.toFixed(decimals)}
                {suffix}
            </span>
        </div>
    );
};

/**
 *
 * @param pct
 */
function gaugeColor (pct: number): string {
    if (0.3 > pct) {
        return "#22c55e";
    }
    if (0.7 > pct) {
        return "#f59e0b";
    }

    return "#ef4444";
}
