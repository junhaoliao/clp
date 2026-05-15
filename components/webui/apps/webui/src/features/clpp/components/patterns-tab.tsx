import {
    Fragment,
    useState,
} from "react";

import {useQuery} from "@tanstack/react-query";
import type {AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type {
    LogtypeEntry,
    LogtypeStatsResponse,
} from "@/features/clpp/types";


const api = hc<AppType>("/");

/**
 * Renders the Patterns tab showing logtype stats from the schema.
 *
 * @param root0
 * @param root0.dataset
 * @return
 */
const PatternsTab = ({dataset}: {dataset: string}) => {
    const [search, setSearch] = useState("");
    const [expandedLogtype, setExpandedLogtype] = useState<number | null>(null);

    const {data, isLoading, error} = useQuery<LogtypeStatsResponse>({
        queryKey: ["logtype-stats",
            dataset],
        queryFn: async () => {
            const res = await api.api["logtype-stats"].$get({
                query: {dataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch logtype stats");
            }

            return res.json() as unknown as Promise<LogtypeStatsResponse>;
        },
        enabled: 0 < dataset.length,
    });

    if (isLoading) {
        return <div className={"p-4 text-sm text-muted-foreground"}>Loading logtype stats...</div>;
    }

    if (error) {
        return (
            <div className={"p-4 text-sm text-red-600"}>
                Error:
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
        .filter(
            (lt) => lt.log_type.toLowerCase().includes(search.toLowerCase()),
        );

    return (
        <div className={"flex flex-col gap-4"}>
            <Input
                placeholder={"Search logtypes..."}
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                }}/>

            <div className={"text-sm text-muted-foreground"}>
                {filtered.length}
                {" "}
                logtype
                {1 !== filtered.length ?
                    "s" :
                    ""}
                {" "}
                |
                {data.totalCount.toLocaleString()}
                {" "}
                total events
            </div>

            <ScrollArea className={"h-[calc(100vh-320px)]"}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className={"w-12"}/>
                            <TableHead>Logtype</TableHead>
                            <TableHead className={"text-right"}>Count</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((lt: LogtypeEntry) => {
                            const isExpanded = expandedLogtype === lt.id;
                            return (
                                <Fragment key={lt.id}>
                                    <TableRow
                                        className={"cursor-pointer"}
                                        onClick={() => {
                                            setExpandedLogtype(
                                                isExpanded ?
                                                    null :
                                                    lt.id,
                                            );
                                        }}
                                    >
                                        <TableCell>
                                            <span
                                                className={"text-muted-foreground " +
                                                    "hover:text-foreground"}
                                            >
                                                {isExpanded ?
                                                    "▼" :
                                                    "▶"}
                                            </span>
                                        </TableCell>
                                        <TableCell className={"font-mono text-xs"}>
                                            {lt.log_type}
                                        </TableCell>
                                        <TableCell className={"text-right"}>
                                            {lt.count.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow>
                                            <TableCell
                                                className={"bg-muted/50 px-8 py-3"}
                                                colSpan={3}
                                            >
                                                <div className={"space-y-2"}>
                                                    <p className={"text-xs text-muted-foreground"}>
                                                        Archive:
                                                        {" "}
                                                        <code className={"text-foreground"}>
                                                            {lt.archive_id}
                                                        </code>
                                                    </p>
                                                    <p className={"text-xs text-muted-foreground"}>
                                                        ID:
                                                        {" "}
                                                        {lt.id}
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
};


export {PatternsTab};
export default PatternsTab;
