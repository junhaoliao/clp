import {useState} from "react";

import {useQuery} from "@tanstack/react-query";
import type {AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import {Badge} from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {SchemaDeduplicationWarning} from "@/features/clpp/components/schema-deduplication-warning";
import type {
    LogtypeStatsResponse,
    SchemaTreeResponse,
} from "@/features/clpp/types";


type SchemaTreeNode = {
    id: string;
    key: string;
    type: "string" | "int" | "float" | "object";
    count: number;
    children: SchemaTreeNode[];
};

const INDENT_PER_LEVEL = 20;
const BASE_PADDING = 8;
const api = hc<AppType>("/");

const TYPE_ICONS: Record<string, string> = {
    string: "Aa",
    int: "#",
    float: "~",
    object: "{}",
};

const TYPE_COLORS: Record<string, string> = {
    string: "bg-green-100 text-green-800",
    int: "bg-blue-100 text-blue-800",
    float: "bg-purple-100 text-purple-800",
    object: "bg-gray-100 text-gray-800",
};

/**
 * Filters a schema tree to only include nodes whose key contains the
 * search string (case-insensitive), preserving the path to matching nodes.
 *
 * @param node
 * @param search
 * @return Filtered node or null if no match in subtree.
 */
const filterTree = (
    node: SchemaTreeNode,
    search: string,
): SchemaTreeNode | null => {
    const matches = node.key.toLowerCase().includes(search.toLowerCase());
    const filteredChildren = node.children
        .map((c) => filterTree(c, search))
        .filter((c): c is SchemaTreeNode => null !== c);

    if (matches || 0 < filteredChildren.length) {
        return {
            ...node,
            children: filteredChildren,
        };
    }

    return null;
};

/**
 * Renders a single node in the schema tree, recursively.
 *
 * @param root0
 * @param root0.node
 * @param root0.depth
 * @return A collapsible schema tree node item component.
 */
const SchemaTreeNodeItem = ({
    node,
    depth = 0,
}: {
    node: SchemaTreeNode;
    depth?: number;
}) => {
    const [isOpen, setIsOpen] = useState(2 > depth);
    const hasChildren = 0 < node.children.length;

    return (
        <div>
            <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
            >
                <div
                    style={{paddingLeft: `${(depth * INDENT_PER_LEVEL) + BASE_PADDING}px`}}
                    className={"flex items-center gap-2 rounded-sm " +
                        "px-2 py-1 hover:bg-muted/50"}
                >
                    {hasChildren ?
                        (
                            <CollapsibleTrigger
                                nativeButton={false}
                                render={
                                    <div
                                        className={
                                            "w-4 cursor-pointer" +
                                            " text-muted-foreground" +
                                            " hover:text-foreground"
                                        }/>
                                }
                            >
                                {isOpen ?
                                    "▼" :
                                    "▶"}
                            </CollapsibleTrigger>
                        ) :
                        (
                            <span className={"w-4"}/>
                        )}
                    <Badge
                        className={`text-[10px] ${TYPE_COLORS[node.type] ?? ""}`}
                        variant={"outline"}
                    >
                        {TYPE_ICONS[node.type] ?? "?"}
                    </Badge>
                    <span className={"font-mono text-sm"}>
                        {node.key}
                    </span>
                    <span className={"text-xs text-muted-foreground"}>
                        (
                        {node.count.toLocaleString()}
                        )
                    </span>
                </div>
                {hasChildren && (
                    <CollapsibleContent>
                        {node.children.map((child) => (
                            <SchemaTreeNodeItem
                                depth={depth + 1}
                                key={child.id}
                                node={child}/>
                        ))}
                    </CollapsibleContent>
                )}
            </Collapsible>
        </div>
    );
};

/**
 * Renders the Schema tab showing the schema tree from an archive.
 *
 * @param root0
 * @param root0.dataset
 * @return The schema tab component with search and tree view.
 */
const SchemaTab = ({dataset}: {dataset: string}) => {
    const [search, setSearch] = useState("");

    const {data, isLoading, error} = useQuery({
        queryKey: ["schema-tree",
            dataset],
        queryFn: async () => {
            const res = await api.api["schema-tree"].$get({
                query: {dataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch schema tree");
            }

            return res.json() as Promise<SchemaTreeResponse>;
        },
        enabled: 0 < dataset.length,
        refetchInterval: false,
    });

    const {data: logtypeData} = useQuery({
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

    if (isLoading) {
        return <div className={"p-4 text-sm text-muted-foreground"}>Loading schema tree...</div>;
    }

    if (error) {
        return (
            <div className={"p-4 text-sm text-red-600"}>
                Error:
                {error.message}
            </div>
        );
    }

    if (!data?.tree) {
        return (
            <div className={"p-4 text-sm text-muted-foreground"}>
                No schema tree data available.
            </div>
        );
    }

    return (
        <div className={"flex flex-col gap-4"}>
            {logtypeData?.logtypes && (
                <SchemaDeduplicationWarning logtypes={logtypeData.logtypes}/>
            )}
            <Input
                placeholder={"Filter schema nodes..."}
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                }}/>

            <div className={"text-sm text-muted-foreground"}>
                Schema tree for dataset:
                {" "}
                <code>
                    {data.dataset}
                </code>
            </div>

            <ScrollArea className={"h-[calc(100vh-280px)]"}>
                <div className={"space-y-0.5"}>
                    {(() => {
                        const filtered = search ?
                            filterTree(data.tree, search) :
                            data.tree;

                        return filtered ?
                            <SchemaTreeNodeItem node={filtered}/> :
                            <p className={"px-2 py-4 text-sm text-muted-foreground"}>
                                No matching nodes.
                            </p>;
                    })()}
                </div>
            </ScrollArea>
        </div>
    );
};


export {SchemaTab};
export default SchemaTab;
