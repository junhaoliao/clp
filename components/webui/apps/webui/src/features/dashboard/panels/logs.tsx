import {
    useCallback,
    useState,
} from "react";

import {usePanelEvent} from "../hooks/use-panel-events";
import type {PanelComponentProps} from "../plugins/registry";


/**
 *
 * @param root0
 * @param root0.data
 * @param root0.id
 * @param root0.options
 */
export const LogsPanel = ({data, id, options}: PanelComponentProps) => {
    const [activeFilter, setActiveFilter] = useState<{field: string; value: unknown} | null>(null);

    const handleFilterClick = useCallback((event: {type: string; sourcePanelId: string; payload: Record<string, unknown>}) => {
        if (event.sourcePanelId === id) {
            return;
        }
        const {field, value} = event.payload;
        if ("string" === typeof field && value !== undefined) {
            setActiveFilter((prev) => (prev && prev.field === field && prev.value === value ?
                null :
                {field, value}));
        }
    }, [id]);

    usePanelEvent("filter-click", handleFilterClick);

    const frame = data[0];

    if (!frame || 0 === frame.length) {
        return (
            <div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>
                No log data
            </div>
        );
    }

    const messageField = frame.fields.find((f) => "message" === f.name || "msg" === f.name || "log" === f.name) ?? frame.fields[0];
    const timeField = frame.fields.find((f) => "time" === f.type);
    const levelField = frame.fields.find((f) => "level" === f.name || "severity" === f.name);
    const showTimestamp = false !== (options["showTimestamp"] as boolean);
    const wrapLines = (options["wrapLines"] as boolean) ?? true;

    const filterField = activeFilter ?
        frame.fields.find((f) => f.name === activeFilter.field) :
        null;

    return (
        <div className={"overflow-auto h-full font-mono text-xs leading-relaxed"}>
            {activeFilter && (
                <div className={"flex items-center gap-1 px-1 py-0.5 bg-primary/10 text-primary text-[10px] sticky top-0 z-10"}>
                    <span>
                        Filter:
                        {activeFilter.field}
                        {" "}
                        =
                        {String(activeFilter.value)}
                    </span>
                    <button
                        className={"ml-1 hover:text-destructive"}
                        type={"button"}
                        onClick={() => {
                            setActiveFilter(null);
                        }}
                    >
                        x
                    </button>
                </div>
            )}
            {Array.from({length: frame.length}, (_, rowIdx) => {
                if (filterField && filterField.values[rowIdx] !== activeFilter!.value) {
                    return null;
                }
                const message = String(messageField?.values[rowIdx] ?? "");
                const time = timeField ?
                    timeField.values[rowIdx] :
                    undefined;
                const level = levelField ?
                    String(levelField.values[rowIdx] ?? "") :
                    undefined;

                return (
                    <div
                        className={"flex gap-2 px-1 hover:bg-muted/30 border-b border-border/30"}
                        key={rowIdx}
                    >
                        {showTimestamp && time !== undefined && (
                            <span className={"text-muted-foreground shrink-0"}>
                                {"number" === typeof time ?
                                    new Date(time).toLocaleTimeString() :
                                    String(time)}
                            </span>
                        )}
                        {level && (
                            <span className={`shrink-0 font-semibold ${levelColor(level)}`}>
                                {level.toUpperCase().padEnd(5)}
                            </span>
                        )}
                        <span
                            className={wrapLines ?
                                "whitespace-pre-wrap break-all" :
                                "whitespace-nowrap"}
                        >
                            {message}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

/**
 *
 * @param level
 */
function levelColor (level: string): string {
    const l = level.toLowerCase();
    if ("error" === l || "err" === l || "fatal" === l || "critical" === l) {
        return "text-red-500";
    }
    if ("warn" === l || "warning" === l) {
        return "text-yellow-500";
    }
    if ("info" === l || "information" === l) {
        return "text-blue-500";
    }
    if ("debug" === l || "trace" === l) {
        return "text-gray-500";
    }

    return "";
}
