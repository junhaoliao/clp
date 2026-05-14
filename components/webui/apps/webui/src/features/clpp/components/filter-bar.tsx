import {useState} from "react";

import {X} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


type FilterType = "EXISTS" | "NEXISTS" | "EQUALS" | "NOT_EQUALS";

type Filter = {
    id: string;
    field: string;
    type: FilterType;
    value?: string;
};

const FILTER_TYPE_LABELS: Record<FilterType, string> = {
    EXISTS: "EXISTS",
    NEXISTS: "NEXISTS",
    EQUALS: "==",
    NOT_EQUALS: "!=",
};

/**
 * Select options for CLPP filter types.
 *
 * @return
 */
const FilterTypeOptions = () => (
    <>
        <SelectItem
            className={"text-xs"}
            value={"EXISTS"}
        >
            EXISTS (CLPP)
        </SelectItem>
        <SelectItem
            className={"text-xs"}
            value={"NEXISTS"}
        >
            NEXISTS (CLPP)
        </SelectItem>
        <SelectItem
            className={"text-xs"}
            value={"EQUALS"}
        >
            Equals
        </SelectItem>
        <SelectItem
            className={"text-xs"}
            value={"NOT_EQUALS"}
        >
            Not Equals
        </SelectItem>
    </>
);

/**
 * Popover for adding a new filter.
 *
 * @param root0
 * @param root0.onAdd
 * @param root0.fieldOptions
 * @return
 */
const AddFilterPopover = ({
    fieldOptions,
    onAdd,
}: {
    fieldOptions: string[];
    onAdd: (filter: Filter) => void;
}) => {
    const [newField, setNewField] = useState<string>(fieldOptions[0] ?? "");
    const [newType, setNewType] = useState<FilterType>("EXISTS");
    const [newValue, setNewValue] = useState("");

    const handleAdd = () => {
        const filter: Filter = {
            id: `${newField}-${newType}-${Date.now()}`,
            field: newField,
            type: newType,
        };

        if ("EXISTS" !== newType && "NEXISTS" !== newType) {
            filter.value = newValue;
        }
        onAdd(filter);
        setNewValue("");
    };

    return (
        <Popover>
            <PopoverTrigger>
                <Button
                    className={"h-7 text-xs"}
                    size={"sm"}
                    variant={"outline"}
                >
                    + Filter
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align={"start"}
                className={"w-80"}
            >
                <div className={"space-y-3"}>
                    <div className={"space-y-1"}>
                        <p className={"text-xs font-medium"}>Field</p>
                        <Select
                            defaultValue={newField}
                            onValueChange={setNewField}
                        >
                            <SelectTrigger className={"h-8 text-xs"}>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                {fieldOptions.map((f) => (
                                    <SelectItem
                                        className={"text-xs"}
                                        key={f}
                                        value={f}
                                    >
                                        {f}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className={"space-y-1"}>
                        <p className={"text-xs font-medium"}>Type</p>
                        <Select
                            defaultValue={newType}
                            onValueChange={(v) => {
                                setNewType(v as FilterType);
                            }}
                        >
                            <SelectTrigger className={"h-8 text-xs"}>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <FilterTypeOptions/>
                            </SelectContent>
                        </Select>
                    </div>

                    {("EXISTS" !== newType && "NEXISTS" !== newType) && (
                        <div className={"space-y-1"}>
                            <p className={"text-xs font-medium"}>Value</p>
                            <Input
                                className={"h-8 text-xs"}
                                placeholder={"Filter value..."}
                                value={newValue}
                                onChange={(e) => {
                                    setNewValue(e.target.value);
                                }}/>
                        </div>
                    )}

                    <Button
                        className={"w-full"}
                        size={"sm"}
                        onClick={handleAdd}
                    >
                        Add Filter
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

/**
 * Filter bar with EXISTS/NEXISTS support for CLPP queries.
 *
 * @param root0
 * @param root0.filters
 * @param root0.onAddFilter
 * @param root0.onRemoveFilter
 * @param root0.fieldOptions
 * @return
 */
const FilterBar = ({
    fieldOptions,
    filters,
    onAddFilter,
    onRemoveFilter,
}: {
    fieldOptions: string[];
    filters: Filter[];
    onAddFilter: (filter: Filter) => void;
    onRemoveFilter: (id: string) => void;
}) => {
    return (
        <div className={"flex flex-wrap items-center gap-2 border-b px-4 py-2"}>
            {filters.map((filter) => (
                <Badge
                    className={"gap-1"}
                    key={filter.id}
                    variant={"secondary"}
                >
                    <span className={"font-mono text-xs"}>
                        {filter.field}
                    </span>
                    <span className={"text-xs font-bold"}>
                        {FILTER_TYPE_LABELS[filter.type]}
                    </span>
                    {filter.value && (
                        <span className={"font-mono text-xs"}>
                            {filter.value}
                        </span>
                    )}
                    <button
                        className={"ml-1 rounded-full hover:bg-muted"}
                        onClick={() => {
                            onRemoveFilter(filter.id);
                        }}
                    >
                        <X className={"h-3 w-3"}/>
                    </button>
                </Badge>
            ))}

            <AddFilterPopover
                fieldOptions={fieldOptions}
                onAdd={onAddFilter}/>
        </div>
    );
};


export {FilterBar};
export type {
    Filter, FilterType,
};
export default FilterBar;
