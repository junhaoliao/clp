import {type Column} from "@tanstack/react-table";
import {
    ArrowDownIcon,
    ArrowUpDown,
    ArrowUpIcon,
} from "lucide-react";

import {cn} from "@/lib/utils";


type DataTableColumnHeaderProps<TData, TValue> = {
    column: Column<TData, TValue>;
    title: string;
    className?: string;
};

/**
 * Sortable column header for DataTable.
 *
 * Click cycles: none → ascending → descending → none.
 *
 * @param root0
 * @param root0.column
 * @param root0.title
 * @param root0.className
 * @return JSX element
 */
const DataTableColumnHeader = <TData, TValue>({
    column,
    title,
    className,
}: DataTableColumnHeaderProps<TData, TValue>) => {
    if (!column.getCanSort()) {
        return (
            <div className={cn(className)}>
                {title}
            </div>
        );
    }

    return (
        <button
            className={cn(
                "-ml-2 flex items-center gap-1 select-none",
                className,
            )}
            onClick={() => {
                const isUnsorted = false === column.getIsSorted();
                column.toggleSorting(isUnsorted);
            }}
        >
            <span>
                {title}
            </span>
            {"asc" === column.getIsSorted() && (
                <ArrowUpIcon className={"h-3.5 w-3.5"}/>
            )}
            {"desc" === column.getIsSorted() && (
                <ArrowDownIcon className={"h-3.5 w-3.5"}/>
            )}
            {!column.getIsSorted() && (
                <ArrowUpDown
                    className={"h-3.5 w-3.5 text-muted-foreground"}/>
            )}
        </button>
    );
};


export {DataTableColumnHeader};
