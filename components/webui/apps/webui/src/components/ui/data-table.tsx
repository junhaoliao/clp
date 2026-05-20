import {Fragment, useState} from "react";

import {
    type ColumnDef,
    type ExpandedState,
    type OnChangeFn,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type Row,
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
    getRowCanExpand?: (row: Row<TData>) => boolean;
    getRowId?: (row: TData) => string;
    onExpandedChange?: OnChangeFn<ExpandedState>;
    pageSize?: number;
    renderSubComponent?: (row: Row<TData>) => React.ReactNode;
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
    getRowCanExpand,
    getRowId,
    onExpandedChange,
    pageSize = 20,
    renderSubComponent,
}: DataTableProps<TData, TValue>) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const handleExpandedChange: OnChangeFn<ExpandedState> = onExpandedChange ?
        (updater) => {
            setExpanded(updater);
            onExpandedChange(updater);
        } :
        setExpanded;

    const table = useReactTable({
        columns: columns,
        data: data,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        ...(getRowCanExpand ? {getRowCanExpand} : {}),
        getPaginationRowModel: getPaginationRowModel(),
        ...(getRowId ? {getRowId} : {}),
        getSortedRowModel: getSortedRowModel(),
        initialState: {pagination: {pageSize}},
        onExpandedChange: handleExpandedChange,
        onSortingChange: setSorting,
        state: {expanded, sorting},
    });

    const {rows} = table.getRowModel();
    const hasRows = 0 < rows.length;
    const totalRows = table.getFilteredRowModel().rows.length;
    const isPlural = 1 !== totalRows;

    // Compute total min-width from column sizes so the table can exceed its
    // container width when many columns are selected, enabling horizontal scroll.
    const totalMinWidth = table
        .getVisibleLeafColumns()
        .reduce((sum, col) => sum + col.getSize(), 0);

    return (
        <div className={"flex flex-col h-full"}>
            <div className={"flex-1 min-h-0 rounded-md border overflow-auto"}>
                <Table
                    style={{minWidth: `${totalMinWidth}px`}}
                >
                    <colgroup>
                        {table.getHeaderGroups().map((headerGroup) =>
                            headerGroup.headers.map((header) => (
                                <col
                                    key={header.id}
                                    style={header.getSize() ?
                                        {width: `${header.getSize()}px`} :
                                        undefined}
                                />
                            )),
                        )}
                    </colgroup>
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
                                <Fragment key={row.id}>
                                    <TableRow>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {row.getIsExpanded() && renderSubComponent && (
                                        <TableRow key={`${row.id}-expanded`}>
                                            <TableCell
                                                className={"p-0 overflow-visible"}
                                                colSpan={row.getVisibleCells().length}
                                            >
                                                {renderSubComponent(row)}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
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
            <div className={"flex items-center justify-between px-2 shrink-0"}>
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
