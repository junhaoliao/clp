import {useRef} from "react";

import {useVirtualizer} from "@tanstack/react-virtual";

import type {PanelComponentProps} from "../plugins/registry";


const ROW_HEIGHT = 28;
const OVERSCAN = 20;

/**
 *
 * @param root0
 * @param root0.data
 * @param root0.options
 * @param root0.height
 */
export const TablePanel = ({data, options, height}: PanelComponentProps) => {
    const frame = data[0];
    const parentRef = useRef<HTMLDivElement>(null);

    if (!frame || 0 === frame.length) {
        return (
            <div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>
                No data
            </div>
        );
    }

    const displayFields = frame.fields.filter(
        (f) => (options["hiddenColumns"] ?
            !((options["hiddenColumns"] as string[]).includes(f.name)) :
            true),
    );

    const rowCount = frame.length;
    const virtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    return (
        <div
            className={"overflow-auto h-full"}
            ref={parentRef}
            style={{maxHeight: 0 < height ?
                height :
                400}}
        >
            <table
                className={"w-full text-xs"}
                style={{display: "flex", flexDirection: "column"}}
            >
                <thead style={{flexShrink: 0}}>
                    <tr className={"border-b text-left text-muted-foreground flex"}>
                        {displayFields.map((field) => (
                            <th
                                className={"px-2 py-1 font-medium whitespace-nowrap flex-1 min-w-0"}
                                key={field.name}
                            >
                                {field.config?.displayName ?? field.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody style={{position: "relative", height: `${virtualizer.getTotalSize()}px`, flexShrink: 0}}>
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const rowIdx = virtualRow.index;
                        return (
                            <tr
                                className={"border-b border-border/50 hover:bg-muted/50 absolute w-full flex"}
                                key={rowIdx}
                                style={{
                                    height: `${virtualRow.size}px`,
                                    top: `${virtualRow.start}px`,
                                }}
                            >
                                {displayFields.map((field) => {
                                    const value = field.values[rowIdx];
                                    return (
                                        <td
                                            className={"px-2 py-1 whitespace-nowrap flex-1 min-w-0 truncate"}
                                            key={field.name}
                                        >
                                            {formatCellValue(value, field.type)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

/**
 *
 * @param value
 * @param type
 */
function formatCellValue (value: unknown, type: string): string {
    if (null === value || value === undefined) {
        return "-";
    }
    if ("time" === type && "number" === typeof value) {
        return new Date(value).toLocaleString();
    }
    if ("number" === type && "number" === typeof value) {
        return value.toLocaleString();
    }

    return String(value);
}
