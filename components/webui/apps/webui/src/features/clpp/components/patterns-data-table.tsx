import {useState} from "react";

import {useQuery} from "@tanstack/react-query";
import {
    type ColumnDef,
    type ExpandedState,
    type Row,
    type Updater,
} from "@tanstack/react-table";
import {type AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";
import {ChevronDownIcon} from "lucide-react";

import {ExpandedRowContent} from "./patterns-expanded-rows";
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
};

/**
 * Builds column definitions for the Patterns data table.
 *
 * @return Column definitions.
 */
const buildColumns = (): ColumnDef<LogtypeEntry>[] => [
    {
        cell: ({row}) => (
            <div className={"flex gap-0.5"}>
                <Button
                    aria-label={"Toggle row details"}
                    className={"h-5 w-5"}
                    size={"icon"}
                    variant={"ghost"}
                    onClick={row.getToggleExpandedHandler()}
                >
                    <ChevronDownIcon
                        className={
                            "h-3 w-3 transition-transform" +
                            ` ${row.getIsExpanded() ?
                                "rotate-180" :
                                ""}`
                        }
                    />
                </Button>
            </div>
        ),
        enableSorting: false,
        header: "Actions",
        id: "actions",
        size: 28,
    },
    {
        accessorKey: "count",
        cell: ({row}) => row.original.count.toLocaleString(),
        header: ({column}) => (
            <DataTableColumnHeader
                column={column}
                title={"Count"}/>
        ),
        size: 60,
    },
    {
        accessorKey: "log_type",
        cell: ({row}) => (
            <span className={"text-xs font-mono"}>
                {row.original.log_type}
            </span>
        ),
        enableSorting: false,
        header: "Pattern",
        size: 400,
    },
];

/**
 * Patterns tab data table with Count, Example, and Actions columns.
 *
 * @param root0
 * @param root0.dataset
 * @return JSX element
 */
const PatternsDataTable = ({
    dataset,
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

    const columns = buildColumns();

    const handleExpandedChange = (updater: Updater<ExpandedState>) => {
        // Resolve the updater to get the new expanded state, then sync
        // expandedIds so the examples query can fetch data for expanded rows.
        setExpandedIds((prev) => {
            const prevState: ExpandedState = Object.fromEntries(
                [...prev].map((id) => [id, true]),
            );
            const resolved: ExpandedState = typeof updater === "function" ?
                updater(prevState) :
                updater;

            return new Set(
                Object.entries(resolved)
                    .filter(([, v]) => v)
                    .map(([k]) => k),
            );
        });
    };

    const renderSubComponent = (row: Row<LogtypeEntry>) => {
        const ck = logtypeCompositeKey(row.original);

        return (
            <ExpandedRowContent
                entry={row.original}
                examples={examplesMap.get(ck) ?? []}/>
        );
    };

    return (
        <div className={"flex flex-col h-full gap-4"}>
            <div className={"flex items-center gap-4 shrink-0"}>
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

            <DataTable
                columns={columns}
                data={filtered}
                getRowCanExpand={() => true}
                getRowId={(row) => logtypeCompositeKey(row)}
                onExpandedChange={handleExpandedChange}
                pageSize={20}
                renderSubComponent={renderSubComponent}/>
        </div>
    );
};

export {PatternsDataTable};
export default PatternsDataTable;
