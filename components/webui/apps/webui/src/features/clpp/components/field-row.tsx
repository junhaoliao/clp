import {useState} from "react";

import {X} from "lucide-react";

import {WildcardOnNumericBadge} from "@/features/clpp/components/wildcard-on-numeric-badge";


type FieldItem = {
    isSharedNode: boolean;
    count: number;
    name: string;
    type: "string" | "int" | "float" | "object";
};

const TYPE_ICONS: Record<string, string> = {
    float: "~",
    int: "#",
    object: "{}",
    string: "Aa",
};

const TYPE_COLORS: Record<string, string> = {
    float: "text-purple-600",
    int: "text-blue-600",
    object: "text-gray-600",
    string: "text-green-600",
};

/**
 * Field row with hover "+" / "×" toggle.
 *
 * @param root0
 * @param root0.field
 * @param root0.isSelected
 * @param root0.onToggleSelect
 * @return JSX element
 */
const FieldRow = ({isSelected, onToggleSelect, field}: {
    field: FieldItem;
    isSelected: boolean;
    onToggleSelect: (name: string) => void;
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={
                "flex items-center gap-1.5 rounded-sm" +
                " px-2 py-1 hover:bg-muted/50"
            }
            onMouseEnter={() => {
                setIsHovered(true);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
            }}
        >
            {isHovered && !isSelected && (
                <button
                    aria-label={"Add field as column"}
                    className={
                        "w-4 h-4 text-xs text-primary" +
                        " hover:text-primary/80 shrink-0"
                    }
                    onClick={() => {
                        onToggleSelect(field.name);
                    }}
                >
                    +
                </button>
            )}
            {isSelected && (
                <button
                    aria-label={"Remove field from columns"}
                    className={
                        "w-4 h-4 text-xs text-muted-foreground" +
                        " hover:text-destructive shrink-0"
                    }
                    onClick={() => {
                        onToggleSelect(field.name);
                    }}
                >
                    <X className={"h-3 w-3"}/>
                </button>
            )}
            {(!isHovered && !isSelected) && (
                <span className={"w-4 h-4 shrink-0"}/>
            )}
            <span
                className={
                    "text-xs font-medium shrink-0" +
                    ` ${TYPE_COLORS[field.type] ?? ""}`
                }
            >
                {TYPE_ICONS[field.type] ?? "?"}
            </span>
            <span
                className={
                    `flex-1 cursor-pointer truncate text-xs${
                        isSelected ?
                            " font-bold" :
                            ""}`
                }
                onClick={() => {
                    onToggleSelect(field.name);
                }}
            >
                {field.name}
            </span>
            {field.isSharedNode && (
                <span
                    className={"text-[10px] text-yellow-600 shrink-0"}
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
            <span className={"text-[10px] text-muted-foreground shrink-0"}>
                {field.count.toLocaleString()}
            </span>
        </div>
    );
};


export type {FieldItem};
export {FieldRow};
