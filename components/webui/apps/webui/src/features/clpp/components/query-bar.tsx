import {
    SearchIcon,
    X,
} from "lucide-react";

import {
    type CompletionItem,
    useQueryBarState,
} from "./use-query-bar-state";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";


const COMPLETION_COLORS: Record<string, string> = {
    "field": "text-foreground",
    "operator": "text-blue-600",
    "syntax-hint": "text-muted-foreground",
};

/**
 * Renders a single completion item button.
 *
 * @param item
 * @param item.item
 * @param item.isActive
 * @param item.onHover
 * @param item.onSelect
 * @return JSX element
 */
const CompletionItemButton = ({
    item,
    isActive,
    onSelect,
    onHover,
}: {
    isActive: boolean;
    item: CompletionItem;
    onHover: () => void;
    onSelect: (item: CompletionItem) => void;
}) => {
    const colorClass = COMPLETION_COLORS[item.type] ?? "text-foreground";

    return (
        <button
            className={
                "flex w-full items-center gap-2 rounded-sm" +
                " px-2 py-1.5 text-xs outline-none" +
                ` ${isActive ?
                    "bg-accent text-accent-foreground" :
                    "hover:bg-accent/50"}`
            }
            onMouseEnter={onHover}
            onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
            }}
        >
            <span className={`font-medium ${colorClass}`}>
                {item.label}
            </span>
            {item.description && (
                <span className={"text-muted-foreground"}>
                    {item.description}
                </span>
            )}
        </button>
    );
};

/**
 * Completion dropdown content rendered inside the Popover.
 *
 * @param root0
 * @param root0.items
 * @param root0.activeIndex
 * @param root0.onHover
 * @param root0.onSelect
 * @return JSX element
 */
const CompletionDropdown = ({
    items,
    activeIndex,
    onHover,
    onSelect,
}: {
    activeIndex: number;
    items: CompletionItem[];
    onHover: (idx: number) => void;
    onSelect: (item: CompletionItem) => void;
}) => (
    <div className={"max-h-64 overflow-y-auto p-1"}>
        {0 === items.length && (
            <p
                className={
                    "px-2 py-4 text-center" +
                " text-sm text-muted-foreground"
                }
            >
                No suggestions
            </p>
        )}
        {items.map((item, idx) => (
            <CompletionItemButton
                isActive={activeIndex === idx}
                item={item}
                key={`${item.type}-${item.label}`}
                onSelect={onSelect}
                onHover={() => {
                    onHover(idx);
                }}/>
        ))}
    </div>
);

/**
 * KQL-style query input bar with inline completion dropdown.
 *
 * @param root0
 * @param root0.dataset
 * @param root0.externalValue
 * @param root0.fieldNames
 * @param root0.onQuerySubmit
 * @param root0.placeholder
 * @return JSX element
 */
const QueryBar = ({
    dataset,
    externalValue,
    fieldNames,
    onQuerySubmit,
    placeholder = "Search logs... (e.g., logLevel: INFO)",
}: {
    dataset: string;
    externalValue?: string | null;
    fieldNames: string[];
    onQuerySubmit: (query: string) => void;
    placeholder?: string;
}) => {
    const {
        activeIndex,
        handleClear,
        handleFocus,
        handleInputChange,
        handleKeyDown,
        handleSelect,
        handleSubmit,
        inputRef,
        items,
        query,
        setActiveIndex,
        setShowDropdown,
        showDropdown,
    } = useQueryBarState(fieldNames, onQuerySubmit, dataset, externalValue);

    return (
        <div
            className={"flex items-center gap-2 border-b px-4 py-2"}
            data-query-bar={""}
        >
            <Popover
                open={showDropdown}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        setShowDropdown(false);
                    }
                }}
            >
                <PopoverTrigger
                    nativeButton={false}
                    render={<div className={"relative flex-1"}/>}
                >
                    <Input
                        className={"h-9 text-sm font-mono"}
                        placeholder={placeholder}
                        ref={inputRef}
                        value={query}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onKeyDown={handleKeyDown}/>
                </PopoverTrigger>
                <PopoverContent
                    align={"start"}
                    className={"w-[var(--anchor-width)] p-0"}
                    initialFocus={false}
                >
                    <CompletionDropdown
                        activeIndex={activeIndex}
                        items={items}
                        onHover={setActiveIndex}
                        onSelect={handleSelect}/>
                </PopoverContent>
            </Popover>
            <Button
                className={"h-9 px-3"}
                size={"sm"}
                variant={"outline"}
                onClick={handleSubmit}
            >
                <SearchIcon className={"h-4 w-4"}/>
            </Button>
            {0 < query.length && (
                <button
                    className={"text-muted-foreground hover:text-foreground"}
                    onClick={handleClear}
                >
                    <X className={"h-4 w-4"}/>
                </button>
            )}
        </div>
    );
};


export {QueryBar};
export default QueryBar;
