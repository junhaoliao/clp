import {useState} from "react";

import {useQuery} from "@tanstack/react-query";
import {type AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Separator} from "@/components/ui/separator";
import {
    type FieldItem,
    FieldRow,
} from "@/features/clpp/components/field-row";
import type {SchemaTreeResponse} from "@/features/clpp/types";


type SchemaTreeNode = {
    children: SchemaTreeNode[];
    count: number;
    id: string;
    key: string;
    type: "string" | "int" | "float" | "object";
};

const api = hc<AppType>("/");

// Internal CLPP identifiers that should not appear as user-facing fields.
// Per design doc §9.2, log type IDs are NOT shown as field names.
const EXCLUDED_FIELD_KEYS = new Set(["log_type"]);

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
    isRoot: boolean = true,
): FieldItem[] => {
    // Skip the root "root" key and empty keys (CLPP variable-position
    // containers) to produce clean field names like "message" instead
    // of "root..message".
    const isSkippedKey = isRoot || !node.key;
    const path = isSkippedKey ?
        parentPath :
        (parentPath ? `${parentPath}.${node.key}` : node.key);
    const items: FieldItem[] = [];

    if ("object" !== node.type && !EXCLUDED_FIELD_KEYS.has(node.key)) {
        items.push({
            count: node.count,
            isSharedNode: isShared,
            name: path,
            type: node.type,
        });
    }

    for (const child of node.children) {
        items.push(...flattenTree(child, path, isShared, false));
    }

    return items;
};

/**
 * Kibana Discover-style field browser sidebar.
 *
 * Two sections: "Selected fields" and "Available fields".
 *
 * @param root0
 * @param root0.dataset
 * @param root0.selectedFields
 * @param root0.onToggleField
 * @return JSX element
 */
const FieldBrowser = ({
    dataset,
    selectedFields,
    onToggleField,
}: {
    dataset: string;
    onToggleField: (name: string) => void;
    selectedFields: string[];
}) => {
    const [search, setSearch] = useState("");

    const {data: treeData} = useQuery({
        enabled: 0 < dataset.length,
        queryFn: async () => {
            const res = await api.api["schema-tree"].$get({
                query: {dataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch schema tree");
            }

            return res.json() as Promise<SchemaTreeResponse>;
        },
        queryKey: ["schema-tree",
            dataset],
        refetchInterval: false,
    });

    const mkStd = (n: string): FieldItem => ({
        count: 0,
        isSharedNode: false,
        name: n,
        type: "string",
    });
    const treeFields = treeData?.tree ? flattenTree(treeData.tree) : [];
    const staticFields = [mkStd("timestamp"), mkStd("service"), mkStd("level")];
    // Deduplicate by name: merge counts for same-named tree fields, then add
    // static fields not already present.
    const fieldsByName = new Map<string, FieldItem>();
    for (const f of treeFields) {
        const existing = fieldsByName.get(f.name);
        if (existing) {
            existing.count += f.count;
        } else {
            fieldsByName.set(f.name, {...f});
        }
    }
    for (const f of staticFields) {
        if (!fieldsByName.has(f.name)) {
            fieldsByName.set(f.name, f);
        }
    }
    const allFields = Array.from(fieldsByName.values());

    const filtered = allFields.filter(
        (f) => f.name.toLowerCase().includes(search.toLowerCase()),
    );

    const selected = filtered.filter(
        (f) => selectedFields.includes(f.name),
    );
    const available = filtered.filter(
        (f) => !selectedFields.includes(f.name),
    );

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
                            className={
                                "px-2 py-1 text-[10px] font-semibold" +
                            " uppercase text-muted-foreground"
                            }
                        >
                            {`Selected Fields (${selected.length})`}
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
                    <p
                        className={
                            "px-2 py-1 text-[10px] font-semibold" +
                        " uppercase text-muted-foreground"
                        }
                    >
                        {`Available Fields (${available.length})`}
                    </p>
                    {available.map((f) => (
                        <FieldRow
                            field={f}
                            isSelected={false}
                            key={f.name}
                            onToggleSelect={onToggleField}/>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
export {FieldBrowser};
export default FieldBrowser;
