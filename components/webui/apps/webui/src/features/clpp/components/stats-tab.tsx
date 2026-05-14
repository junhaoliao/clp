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
import type {LogtypeStatsResponse} from "@/features/clpp/types";


const LOGTYPE_NAME_MAX = 20;
const LOGTYPE_NAME_DISPLAY_MAX = 18;
const api = hc<AppType>("/");

/**
 * Renders the Stats tab showing logtype occurrence charts and summary cards.
 *
 * @param root0
 * @param root0.dataset
 * @return The stats tab component with charts and summary cards.
 */
const StatsTab = ({dataset}: {dataset: string}) => {
    const {data, isLoading, error} = useQuery({
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
        return <div className={"p-4 text-sm text-muted-foreground"}>Loading stats...</div>;
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
        return <div className={"p-4 text-sm text-muted-foreground"}>No stats data available.</div>;
    }

    const top10 = [...data.logtypes]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((lt) => ({
            name: LOGTYPE_NAME_MAX < lt.logtype.length ?
                `${lt.logtype.slice(0, LOGTYPE_NAME_DISPLAY_MAX)}...` :
                lt.logtype,
            count: lt.count,
        }));

    return (
        <div className={"space-y-4"}>
            <div className={"grid grid-cols-3 gap-4"}>
                <Card>
                    <CardHeader className={"pb-2"}>
                        <CardTitle className={"text-sm"}>Total Logtypes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={"text-2xl font-bold"}>
                            {data.logtypes.length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className={"pb-2"}>
                        <CardTitle className={"text-sm"}>Total Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={"text-2xl font-bold"}>
                            {data.totalCount.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className={"pb-2"}>
                        <CardTitle className={"text-sm"}>Dataset</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={"truncate font-mono text-sm"}>
                            {dataset}
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
        </div>
    );
};


export {StatsTab};
export default StatsTab;
