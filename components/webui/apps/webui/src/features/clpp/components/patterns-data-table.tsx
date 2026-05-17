import {useState} from "react";

import {useQuery} from "@tanstack/react-query";
import {type ColumnDef} from "@tanstack/react-table";
import {type AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";
import {
    ChevronDownIcon,
    MinusIcon,
    PlusIcon,
} from "lucide-react";

import {ExpandedRows} from "./patterns-expanded-rows";
import {useLogtypeExamples} from "./use-logtype-examples";

import {Button} from "@/components/ui/button";
import {DataTable} from "@/components/ui/data-table";
import {DataTableColumnHeader} from "@/components/ui/data-table-column-header";
import {Input} from "@/components/ui/input";
import {
    logtypeCompositeKey,
    type LogtypeEntry,
    type LogtypeStatsResponse,
} from "@/features/clpp/types";


const api = hc<AppType>("/");

type PatternsDataTableProps = {
    dataset: string;
    onAddPatternFilter?: (logtypeId: number) => void;
    onRemovePatternFilter?: (logtypeId: number) => void;
};

/**
 * Builds column definitions for the Patterns data table.
 *
 * @param onAdd
 * @param onRemove
 * @param expandedIds
 * @param toggleExpanded
 * @return Column definitions.
 */
const buildColumns = (
    onAdd: (logtypeId: number) => void,
    onRemove: (logtypeId: number) => void,
    expandedIds: Set<string>,
    toggleExpanded: (key: string) => void,
): ColumnDef<LogtypeEntry>[] => [
    {
        accessorKey: "count",
        cell: ({row}) => row.original.count.toLocaleString(),
        header: ({column}) => (
            <DataTableColumnHeader
                column={column}
                title={"Count"}/>
        ),
    },
    {
        accessorKey: "log_type",
        cell: ({row}) => (
            <span className={"truncate max-w-[400px] text-xs font-mono"}>
                {row.original.log_type}
            </span>
        ),
        enableSorting: false,
        header: "Example",
    },
    {
        cell: ({row}) => {
            const ck = logtypeCompositeKey(row.original);

            return (
                <div className={"flex gap-1"}>
                    <Button
                        aria-label={"Add filter for this pattern"}
                        className={"h-6 w-6"}
                        size={"icon"}
                        variant={"ghost"}
                        onClick={() => {
                            onAdd(row.original.id);
                        }}
                    >
                        <PlusIcon className={"h-3.5 w-3.5"}/>
                    </Button>
                    <Button
                        aria-label={"Exclude this pattern"}
                        className={"h-6 w-6"}
                        size={"icon"}
                        variant={"ghost"}
                        onClick={() => {
                            onRemove(row.original.id);
                        }}
                    >
                        <MinusIcon className={"h-3.5 w-3.5"}/>
                    </Button>
                    <Button
                        aria-label={"Toggle row details"}
                        className={"h-6 w-6"}
                        size={"icon"}
                        variant={"ghost"}
                        onClick={() => {
                            toggleExpanded(ck);
                        }}
                    >
                        <ChevronDownIcon
                            className={
                                "h-3.5 w-3.5 transition-transform" +
                                ` ${expandedIds.has(ck) ?
                                    "rotate-180" :
                                    ""}`
                            }/>
                    </Button>
                </div>
            );
        },
        enableSorting: false,
        header: "Actions",
        id: "actions",
    },
];

/**
 * Patterns tab data table with Count, Example, and Actions columns.
 *
 * @param root0
 * @param root0.dataset
 * @param root0.onAddPatternFilter
 * @param root0.onRemovePatternFilter
 * @return JSX element
 */
const PatternsDataTable = ({
    dataset,
    onAddPatternFilter,
    onRemovePatternFilter,
}: PatternsDataTableProps) => {
    const [search, setSearch] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const {data, isLoading, error} = useQuery<LogtypeStatsResponse>({
        enabled: 0 < dataset.length,
        queryFn: async () => {
            const res = await api.api["logtype-stats"].$get({
                query: {dataset: dataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch logtype stats");
            }

            return res.json() as unknown as Promise<LogtypeStatsResponse>;
        },
        queryKey: ["logtype-stats",
            dataset],
        refetchInterval: false,
    });

    const expandedEntries = (data?.logtypes ?? []).filter((lt) => expandedIds.has(logtypeCompositeKey(lt)));
    const examplesMap = useLogtypeExamples(dataset, expandedEntries);

    if (isLoading) {
        return (
            <div className={"p-4 text-sm text-muted-foreground"}>
                Loading logtype stats...
            </div>
        );
    }

    if (error) {
        return (
            <div className={"p-4 text-sm text-red-600"}>
                Error:
                {" "}
                {error.message}
            </div>
        );
    }

    if (!data) {
        return (
            <div className={"p-4 text-sm text-muted-foreground"}>
                No logtype data available.
            </div>
        );
    }

    const filtered = data.logtypes
        .filter((lt) => lt.log_type)
        .filter((lt) => lt.log_type.toLowerCase().includes(
            search.toLowerCase(),
        ));

    const toggleExpanded = (key: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }

            return next;
        });
    };

    const columns = buildColumns(
        onAddPatternFilter ?? (() => {
        }),
        onRemovePatternFilter ?? (() => {
        }),
        expandedIds,
        toggleExpanded,
    );

    return (
        <div className={"flex flex-col gap-4"}>
            <div className={"flex items-center gap-4"}>
                <Input
                    className={"h-8 text-xs max-w-xs"}
                    placeholder={"Filter logtypes..."}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                    }}/>
                <p className={"text-sm text-muted-foreground"}>
                    {filtered.length.toLocaleString()}
                    {" "}
                    logtype
                    {1 !== filtered.length && "s"}
                    {" "}
                    |
                    {" "}
                    {data.totalCount.toLocaleString()}
                    {" "}
                    total events
                </p>
            </div>

            <div className={"rounded-md border"}>
                <DataTable
                    columns={columns}
                    data={filtered}
                    getRowId={(row) => logtypeCompositeKey(row)}
                    pageSize={20}/>
            </div>

            {0 < expandedIds.size && (
                <ExpandedRows
                    examplesMap={examplesMap}
                    expandedIds={expandedIds}
                    filtered={filtered}/>
            )}
        </div>
    );
};

export {PatternsDataTable};
export default PatternsDataTable;
