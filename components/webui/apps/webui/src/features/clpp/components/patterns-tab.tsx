import {
    Fragment,
    useState,
} from "react";

import {useQuery} from "@tanstack/react-query";
import type {AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Separator} from "@/components/ui/separator";
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

const VARIABLE_TYPE_COLORS: Record<string, string> = {
    int: "bg-blue-100 text-blue-800",
    float: "bg-purple-100 text-purple-800",
    string: "bg-green-100 text-green-800",
};

/**
 * Renders the expanded variable details for a logtype row.
 *
 * @param root0
 * @param root0.lt
 * @return
 */
const LogtypeDetailRow = ({lt}: {lt: LogtypeEntry}) => (
    <TableRow>
        <TableCell
            className={"bg-muted/50 px-8 py-3"}
            colSpan={4}
        >
            <div className={"space-y-2"}>
                <p className={"text-xs font-medium"}>
                    Variables (
                    {lt.variables.length}
                    )
                </p>
                <div className={"flex flex-wrap gap-2"}>
                    {lt.variables.map((v) => (
                        <Badge
                            className={VARIABLE_TYPE_COLORS[v.type] ?? ""}
                            key={v.index}
                            variant={"outline"}
                        >
                            #
                            {v.index}
                            {" "}
                            {v.type}
                        </Badge>
                    ))}
                </div>
                <Separator/>
                <p className={"text-xs text-muted-foreground"}>
                    Template:
                    {" "}
                    <code className={"text-foreground"}>
                        {lt.template}
                    </code>
                </p>
            </div>
        </TableCell>
    </TableRow>
);

/**
 * Renders the Patterns tab showing logtype stats from the schema.
 *
 * @param root0
 * @param root0.dataset
 * @return
 */
const PatternsTab = ({dataset}: {dataset: string}) => {
    const [search, setSearch] = useState("");
    const [expandedLogtype, setExpandedLogtype] = useState<string | null>(null);

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

    const filtered = data.logtypes.filter(
        (lt) => lt.logtype.toLowerCase().includes(search.toLowerCase()) ||
            lt.template.toLowerCase().includes(search.toLowerCase()),
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
                            <TableHead>Template</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((lt) => {
                            const isExpanded = expandedLogtype === lt.logtype;
                            return (
                                <Fragment key={lt.logtype}>
                                    <TableRow
                                        className={"cursor-pointer"}
                                        onClick={() => {
                                            setExpandedLogtype(
                                                isExpanded ?
                                                    null :
                                                    lt.logtype
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
                                            {lt.logtype}
                                        </TableCell>
                                        <TableCell className={"text-right"}>
                                            {lt.count.toLocaleString()}
                                        </TableCell>
                                        <TableCell
                                            className={"max-w-md truncate " +
                                                "font-mono text-xs"}
                                        >
                                            {lt.template}
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <LogtypeDetailRow lt={lt}/>
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
