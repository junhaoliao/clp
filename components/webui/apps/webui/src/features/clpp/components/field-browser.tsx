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
import {Separator} from "@/components/ui/separator";
import {WildcardOnNumericBadge} from "@/features/clpp/components/wildcard-on-numeric-badge";
import type {SchemaTreeResponse} from "@/features/clpp/types";


type SchemaTreeNode = {
    id: string;
    key: string;
    type: "string" | "int" | "float" | "object";
    count: number;
    children: SchemaTreeNode[];
};

const api = hc<AppType>("/");
type FieldItem = {
    name: string;
    type: "string" | "int" | "float" | "object";
    count: number;
    isSharedNode: boolean;
};

const TYPE_ICONS: Record<string, string> = {
    string: "Aa",
    int: "#",
    float: "~",
    object: "{}",
};

const TYPE_COLORS: Record<string, string> = {
    string: "text-green-600",
    int: "text-blue-600",
    float: "text-purple-600",
    object: "text-gray-600",
};

/**
 * Flattens the schema tree into a list of field items.
 *
 * @param node
 * @param parentPath
 * @param isShared
 * @return Flat list of field items from the schema tree.
 */
const flattenTree = (
    node: SchemaTreeNode,
    parentPath: string = "",
    isShared: boolean = false,
): FieldItem[] => {
    const path = parentPath ?
        `${parentPath}.${node.key}` :
        node.key;
    const items: FieldItem[] = [];

    if ("object" !== node.type) {
        items.push({
            name: path,
            type: node.type,
            count: node.count,
            isSharedNode: isShared,
        });
    }

    for (const child of node.children) {
        items.push(...flattenTree(child, path, isShared));
    }

    return items;
};

/**
 * A single field row with expand/collapse for top values.
 *
 * @param root0
 * @param root0.field
 * @param root0.isSelected
 * @param root0.onToggleSelect
 * @return A collapsible field row component.
 */
const FieldRow = ({isSelected, onToggleSelect, field}: {
    field: FieldItem;
    isSelected: boolean;
    onToggleSelect: (name: string) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
        >
            <div className={"flex items-center gap-1.5 rounded-sm px-2 py-1 hover:bg-muted/50"}>
                <CollapsibleTrigger render={<button className="w-3 text-[10px] text-muted-foreground hover:text-foreground" />}>
                    {isOpen ?
                        "▼" :
                        "▶"}
                </CollapsibleTrigger>
                <span className={`text-xs font-medium ${TYPE_COLORS[field.type] ?? ""}`}>
                    {TYPE_ICONS[field.type] ?? "?"}
                </span>
                <span
                    className={`flex-1 cursor-pointer truncate text-xs${isSelected ?
                        " font-bold" :
                        ""}`}
                    onClick={() => {
                        onToggleSelect(field.name);
                    }}
                >
                    {field.name}
                </span>
                {field.isSharedNode && (
                    <span
                        className={"text-[10px] text-yellow-600"}
                        title={"Shared node — may cause ambiguous queries"}
                    >
                        [!]
                    </span>
                )}
                {("int" === field.type || "float" === field.type) && (
                    <WildcardOnNumericBadge
                        fieldName={field.name}
                        fieldType={field.type}/>
                )}
                <span className={"text-[10px] text-muted-foreground"}>
                    {field.count.toLocaleString()}
                </span>
            </div>
            <CollapsibleContent>
                <div className={"ml-6 border-l px-2 py-1 text-xs text-muted-foreground"}>
                    <p>
                        Type:
                        {field.type}
                    </p>
                    <p>
                        Count:
                        {field.count.toLocaleString()}
                    </p>
                    {field.isSharedNode && (
                        <p className={"text-yellow-700"}>
                            Warning: shared node
                            {" "}
                            — deduplication trap
                        </p>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};

/**
 * Kibana Discover-style field browser sidebar.
 *
 * Two sections:
 * - "Selected fields": fields that appear as columns in the results table
 * - "Available fields": all other fields from the schema tree
 *
 * Always shows standard indexed fields plus "LOGTYPE FIELDS [CLPP]"
 * from Schema Tree API when available.
 *
 * @param root0
 * @param root0.selectedFields
 * @param root0.onToggleField
 * @param root0.dataset
 * @return The field browser sidebar component.
 */
const FieldBrowser = ({
    dataset,
    selectedFields,
    onToggleField,
}: {
    dataset: string;
    selectedFields: string[];
    onToggleField: (name: string) => void;
}) => {
    const [search, setSearch] = useState("");

    const {data: treeData} = useQuery({
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
    });

    const standardFields: FieldItem[] = [
        {name: "timestamp", type: "string", count: 0, isSharedNode: false},
        {name: "service", type: "string", count: 0, isSharedNode: false},
        {name: "level", type: "string", count: 0, isSharedNode: false},
    ];

    const clppFields: FieldItem[] = treeData?.tree ?
        flattenTree(treeData.tree) :
        [];

    const allFields = [
        ...standardFields,
        ...clppFields,
    ];

    const filtered = allFields.filter(
        (f) => f.name.toLowerCase().includes(search.toLowerCase()),
    );

    const selected = filtered.filter((f) => selectedFields.includes(f.name));
    const available = filtered.filter((f) => !selectedFields.includes(f.name));

    return (
        <div className={"flex h-full w-60 flex-col border-r bg-background"}>
            <div className={"p-2"}>
                <Input
                    className={"h-7 text-xs"}
                    placeholder={"Filter fields..."}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                    }}/>
            </div>

            <ScrollArea className={"flex-1"}>
                {0 < selected.length && (
                    <div>
                        <p
                            className={"px-2 py-1 text-[10px] " +
                                "font-semibold uppercase " +
                                "text-muted-foreground"}
                        >
                            Selected Fields
                        </p>
                        {selected.map((f) => (
                            <FieldRow
                                field={f}
                                isSelected={true}
                                key={f.name}
                                onToggleSelect={onToggleField}/>
                        ))}
                        <Separator className={"my-1"}/>
                    </div>
                )}

                <div>
                    <p className={"px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground"}>
                        Available Fields
                    </p>
                    {available.map((f) => (
                        <FieldRow
                            field={f}
                            isSelected={false}
                            key={f.name}
                            onToggleSelect={onToggleField}/>
                    ))}
                </div>

                {0 < clppFields.length && (
                    <>
                        <Separator className={"my-1"}/>
                        <div className={"px-2 py-1"}>
                            <Badge
                                className={"text-[10px]"}
                                variant={"outline"}
                            >
                                LOGTYPE FIELDS [CLPP]
                            </Badge>
                        </div>
                    </>
                )}
            </ScrollArea>
        </div>
    );
};


export {FieldBrowser};
export default FieldBrowser;
