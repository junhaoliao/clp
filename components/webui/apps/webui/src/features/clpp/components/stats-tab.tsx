import {useQuery} from "@tanstack/react-query";
import type {AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type {
    LogtypeStatsResponse,
    SchemaTreeResponse,
} from "@/features/clpp/types";
import {analyzeSharedNodes} from "@/features/clpp/utils/shared-node-analysis";


const LOGTYPE_NAME_MAX = 20;
const LOGTYPE_NAME_DISPLAY_MAX = 18;
const api = hc<AppType>("/");

/**
 * Counts shared nodes in a schema tree by traversing recursively.
 *
 * A shared node is one whose key appears multiple times under
 * the same parent (indicating JSON key deduplication).
 *
 * @param node
 * @return Number of shared nodes in the subtree.
 */
const countSharedNodes = (node: SchemaTreeResponse["tree"]): number => {
    let count = 0;
    const keyCounts = new Map<string, number>();
    for (const child of node.children) {
        keyCounts.set(child.key, (keyCounts.get(child.key) ?? 0) + 1);
    }
    for (const [_, c] of keyCounts) {
        if (1 < c) {
            count++;
        }
    }
    for (const child of node.children) {
        count += countSharedNodes(child);
    }

    return count;
};

/**
 * Renders the Stats tab showing logtype occurrence charts and summary cards.
 *
 * @param root0
 * @param root0.dataset
 * @return The stats tab component with charts and summary cards.
 */
const StatsTab = ({dataset}: {dataset: string}) => {
    const {data: logtypeData, isLoading: ltLoading, error: ltError} = useQuery({
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
        refetchInterval: false,
    });

    const {data: schemaData} = useQuery({
        queryKey: ["schema-tree",
            dataset],
        queryFn: async () => {
            const res = await api.api["schema-tree"].$get({
                query: {dataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch schema tree");
            }

            return res.json() as unknown as Promise<SchemaTreeResponse>;
        },
        enabled: 0 < dataset.length,
        refetchInterval: false,
    });

    if (ltLoading) {
        return <div className={"p-4 text-sm text-muted-foreground"}>Loading stats...</div>;
    }

    if (ltError) {
        return (
            <div className={"p-4 text-sm text-red-600"}>
                Error:
                {ltError.message}
            </div>
        );
    }

    if (!logtypeData) {
        return <div className={"p-4 text-sm text-muted-foreground"}>No stats data available.</div>;
    }

    const sharedNodeWarnings = analyzeSharedNodes(logtypeData.logtypes);
    const schemaSharedNodes = schemaData ? countSharedNodes(schemaData.tree) : 0;
    const sharedNodeCount = Math.max(sharedNodeWarnings.length, schemaSharedNodes);

    const top10 = [...logtypeData.logtypes]
        .filter((lt) => lt.log_type)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((lt) => ({
            name: LOGTYPE_NAME_MAX < lt.log_type.length ?
                `${lt.log_type.slice(0, LOGTYPE_NAME_DISPLAY_MAX)}...` :
                lt.log_type,
            count: lt.count,
        }));

    return (
        <div className={"space-y-4"}>
            <div className={"grid grid-cols-4 gap-4"}>
                <Card>
                    <CardHeader className={"pb-2"}>
                        <CardTitle className={"text-sm"}>Total Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={"text-2xl font-bold"}>
                            {logtypeData.totalCount.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className={"pb-2"}>
                        <CardTitle className={"text-sm"}>Logtypes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={"text-2xl font-bold"}>
                            {logtypeData.logtypes.length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className={"pb-2"}>
                        <CardTitle className={"text-sm"}>Shared Nodes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={"text-2xl font-bold"}>
                            {sharedNodeCount}
                        </p>
                        {0 < sharedNodeCount && (
                            <p className={"text-xs text-yellow-600"}>
                                Deduplication trap
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className={"pb-2"}>
                        <CardTitle className={"text-sm"}>Compression Ratio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={"text-2xl font-bold text-muted-foreground"}>
                            N/A
                        </p>
                        <p className={"text-xs text-muted-foreground"}>
                            Pending archive stats API
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className={"text-sm"}>Top Logtypes by Event Count</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer
                        height={300}
                        width={"100%"}
                    >
                        <BarChart
                            data={top10}
                            layout={"vertical"}
                        >
                            <XAxis type={"number"}/>
                            <YAxis
                                dataKey={"name"}
                                tick={{fontSize: 11}}
                                type={"category"}
                                width={120}/>
                            <Tooltip/>
                            <Bar
                                dataKey={"count"}
                                fill={"hsl(var(--chart-1))"}
                                radius={4}/>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {0 < sharedNodeWarnings.length && (
                <Card>
                    <CardHeader>
                        <CardTitle className={"text-sm"}>Schema Coverage</CardTitle>
                    </CardHeader>
                    <CardContent className={"text-xs"}>
                        <p className={"text-muted-foreground"}>
                            Shared nodes:
                            {" "}
                            {sharedNodeWarnings.map((w, i) => (
                                <span key={i}>
                                    {0 < i && ", "}
                                    <code className={"text-foreground"}>
                                        {w.logtypes.join("/")}
                                    </code>
                                    {" "}
                                    (variable #{w.variableIndex})
                                </span>
                            ))}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};


export {StatsTab};
export default StatsTab;
