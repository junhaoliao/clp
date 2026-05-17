import {type ColumnDef} from "@tanstack/react-table";
import dayjs from "dayjs";

import {DATETIME_FORMAT_TEMPLATE} from "../../../typings/datetime";

import {DataTable} from "@/components/ui/data-table";
import {DataTableColumnHeader} from "@/components/ui/data-table-column-header";
import type {LogEvent} from "@/features/clpp/types";


type LogsDataTableProps = {
    data: LogEvent[];
    selectedFields: string[];
};

/**
 * Checks if a value is non-null.
 *
 * @param value
 * @return Whether the value is not null.
 */
const hasValue = (value: unknown): boolean => null !== value;

/**
 * Converts an unknown value to a display-safe string.
 *
 * @param value
 * @return String representation safe for rendering.
 */
const formatUnknown = (value: unknown): string => {
    if ("string" === typeof value) {
        return value;
    }

    if ("boolean" === typeof value || "number" === typeof value) {
        return String(value);
    }

    if (null === value) {
        return "—";
    }

    try {
        return JSON.stringify(value);
    } catch {
        return "—";
    }
};

/**
 * Builds column definitions for the Logs data table.
 *
 * Default columns: Timestamp (sortable) + Body (truncated).
 * Dynamic columns: one per field in selectedFields.
 *
 * @param selectedFields
 * @return Column definitions for the logs data table.
 */
const buildColumns = (selectedFields: string[]): ColumnDef<LogEvent>[] => {
    const columns: ColumnDef<LogEvent>[] = [
        {
            accessorKey: "timestamp",
            cell: ({row}) => {
                const ts = row.getValue("timestamp");
                const num = "number" === typeof ts ?
                    ts :
                    Number(ts);

                return (
                    <span className={"font-mono text-xs whitespace-nowrap"}>
                        {Number.isNaN(num) ?
                            String(ts) :
                            dayjs.utc(num).format(DATETIME_FORMAT_TEMPLATE)}
                    </span>
                );
            },
            header: ({column}) => (
                <DataTableColumnHeader
                    column={column}
                    title={"Timestamp"}/>
            ),
        },
        {
            accessorKey: "body",
            cell: ({row}) => (
                <div className={"truncate max-w-[600px] text-xs font-mono"}>
                    {row.original.body}
                </div>
            ),
            enableSorting: false,
            header: "Body",
        },
    ];

    // Dynamic columns from selectedFields (excluding timestamp and body)
    const dynamicFields = selectedFields.filter(
        (f) => "body" !== f && "message" !== f && "timestamp" !== f,
    );

    for (const field of dynamicFields) {
        columns.push({
            accessorKey: field,
            cell: ({row}) => {
                const value = row.original[field];

                return (
                    <span className={"truncate text-xs"}>
                        {hasValue(value) ?
                            formatUnknown(value) :
                            "—"}
                    </span>
                );
            },
            enableSorting: false,
            header: field,
        });
    }

    return columns;
};

/**
 * Logs tab data table using TanStack Table with dynamic columns.
 *
 * Default columns: Timestamp + Body.
 * Additional columns derived from selectedFields state in ExplorePage.
 *
 * @param root0
 * @param root0.data
 * @param root0.selectedFields
 * @return JSX element
 */
const LogsDataTable = ({data, selectedFields}: LogsDataTableProps) => {
    const columns = buildColumns(selectedFields);

    return (
        <DataTable
            columns={columns}
            data={data}
            pageSize={20}/>
    );
};


export {LogsDataTable};
export default LogsDataTable;
