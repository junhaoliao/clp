import {useQuery} from "@tanstack/react-query";
import {type AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {countSharedNodes} from "@/pages/IngestPage/shared-node-count";
import type {SchemaTreeResponse} from "@/features/clpp/types";


const api = hc<AppType>("/");

type ClppStatsRowProps = {
    dataset: string;
};

/**
 * Renders a row of 3 CLPP stat cards (Logtypes, Schema, Shared Nodes)
 * fetched from Hono API endpoints.
 *
 * These stats come from /api/logtype-stats and /api/schema-tree
 * (MongoDB query jobs), not SQL — so they're rendered alongside
 * rather than inside the DashboardGrid.
 *
 * @param root0
 * @param root0.dataset
 * @return JSX element
 */
const ClppStatsRow = ({dataset}: ClppStatsRowProps) => {
    const enabled = 0 < dataset.length;

    const {data: logtypeStatsData, isPending: isLogtypePending} = useQuery({
        enabled,
        queryFn: async () => {
            const res = await api.api["logtype-stats"].$get({
                query: {dataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch logtype stats");
            }

            return res.json();
        },
        queryKey: ["logtype-stats-details", dataset],
        refetchInterval: false,
    });

    const {data: schemaTreeData, isPending: isSchemaPending} = useQuery({
        enabled,
        queryFn: async () => {
            const res = await api.api["schema-tree"].$get({
                query: {dataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch schema tree");
            }

            return res.json() as Promise<SchemaTreeResponse>;
        },
        queryKey: ["schema-tree-details", dataset],
        refetchInterval: false,
    });

    const isLoading = isLogtypePending || isSchemaPending;
    const numLogtypes = logtypeStatsData?.logtypes?.length ?? null;
    const hasSchema = schemaTreeData?.tree ?
        0 < schemaTreeData.tree.children.length :
        false;
    const numSharedNodes = schemaTreeData?.tree ?
        countSharedNodes(schemaTreeData.tree) :
        null;

    return (
        <div className={"grid grid-cols-3 gap-4 px-4 pb-4"}>
            <Card size="sm">
                <CardHeader>
                    <div className={"flex items-center justify-between"}>
                        <CardTitle className={"text-sm"}>Logtypes</CardTitle>
                        <Badge variant="secondary" className={"text-[10px]"}>CLPP</Badge>
                    </div>
                </CardHeader>
                <CardContent className={"pt-0"}>
                    <span className={"font-bold tabular-nums text-2xl"}>
                        {isLoading ?
                            "—" :
                            (numLogtypes ?? 0).toLocaleString()}
                    </span>
                </CardContent>
            </Card>
            <Card size="sm">
                <CardHeader>
                    <div className={"flex items-center justify-between"}>
                        <CardTitle className={"text-sm"}>Schema</CardTitle>
                        <Badge variant="secondary" className={"text-[10px]"}>CLPP</Badge>
                    </div>
                </CardHeader>
                <CardContent className={"pt-0"}>
                    <span className={"font-bold tabular-nums text-2xl"}>
                        {isLoading ?
                            "—" :
                            hasSchema ?
                                "Yes" :
                                "No"}
                    </span>
                </CardContent>
            </Card>
            <Card size="sm">
                <CardHeader>
                    <div className={"flex items-center justify-between"}>
                        <CardTitle className={"text-sm"}>Shared Nodes</CardTitle>
                        <Badge variant="secondary" className={"text-[10px]"}>CLPP</Badge>
                    </div>
                </CardHeader>
                <CardContent className={"pt-0"}>
                    <span className={"font-bold tabular-nums text-2xl"}>
                        {isLoading ?
                            "—" :
                            (numSharedNodes ?? 0).toLocaleString()}
                    </span>
                    {!isLoading && 0 < (numSharedNodes ?? 0) && (
                        <Badge variant="outline" className={"ml-2 text-[10px] text-yellow-600 border-yellow-600/30"}>
                            Warning
                        </Badge>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export {ClppStatsRow};
