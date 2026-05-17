import {useState} from "react";

import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";


type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    getRowId?: (row: TData) => string;
    pageSize?: number;
};

/**
 * Generic data-table component built on TanStack Table + shadcn Table primitives.
 *
 * Provides sorting and pagination out of the box.
 *
 * @param root0
 * @param root0.columns
 * @param root0.data
 * @param root0.getRowId
 * @param root0.pageSize
 * @return JSX element
 */
const DataTable = <TData, TValue>({
    columns,
    data,
    getRowId,
    pageSize = 20,
}: DataTableProps<TData, TValue>) => {
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        columns: columns,
        data: data,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        ...(getRowId ? {getRowId} : {}),
        getSortedRowModel: getSortedRowModel(),
        initialState: {pagination: {pageSize}},
        onSortingChange: setSorting,
        state: {sorting},
    });

    const {rows} = table.getRowModel();
    const hasRows = 0 < rows.length;
    const totalRows = table.getFilteredRowModel().rows.length;
    const isPlural = 1 !== totalRows;

    return (
        <div className={"space-y-2"}>
            <div className={"rounded-md border"}>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ?
                                            null :
                                            flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {hasRows ?
                            rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )) :
                            (
                                <TableRow>
                                    <TableCell
                                        className={"h-24 text-center"}
                                        colSpan={columns.length}
                                    >
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                    </TableBody>
                </Table>
            </div>
            <div className={"flex items-center justify-between px-2"}>
                <p className={"text-sm text-muted-foreground"}>
                    {totalRows}
                    {" "}
                    result
                    {isPlural && "s"}
                </p>
                <div className={"flex items-center gap-2"}>
                    <button
                        disabled={!table.getCanPreviousPage()}
                        className={
                            "inline-flex h-8 w-8 items-center" +
                            " justify-center rounded-md text-sm" +
                            " disabled:opacity-50"
                        }
                        onClick={() => {
                            table.previousPage();
                        }}
                    >
                        {"<"}
                    </button>
                    <span className={"text-sm text-muted-foreground"}>
                        Page
                        {" "}
                        {table.getState().pagination.pageIndex + 1}
                        {" "}
                        of
                        {" "}
                        {table.getPageCount()}
                    </span>
                    <button
                        disabled={!table.getCanNextPage()}
                        className={
                            "inline-flex h-8 w-8 items-center" +
                            " justify-center rounded-md text-sm" +
                            " disabled:opacity-50"
                        }
                        onClick={() => {
                            table.nextPage();
                        }}
                    >
                        {">"}
                    </button>
                </div>
            </div>
        </div>
    );
};


export {DataTable};
