import * as React from "react"

import {
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from "lucide-react"
import { Select } from "@base-ui/react/select"

import {cn} from "@/lib/utils"


const SelectRoot = ({
    ...props
}: React.ComponentProps<typeof Select.Root>) => {
    return (
        <Select.Root
            data-slot={"select"}
            {...props}/>
    );
};

const SelectGroup = ({
    ...props
}: React.ComponentProps<typeof Select.Group>) => {
    return (
        <Select.Group
            data-slot={"select-group"}
            {...props}/>
    );
};

const SelectValue = ({
    ...props
}: React.ComponentProps<typeof Select.Value>) => {
    return (
        <Select.Value
            data-slot={"select-value"}
            {...props}/>
    );
};

const SelectTrigger = ({
    className,
    size = "default",
    children,
    ...props
}: React.ComponentProps<typeof Select.Trigger> & {
    size?: "sm" | "default";
}) => {
    return (
        <Select.Trigger
            data-size={size}
            data-slot={"select-trigger"}
            className={cn(
                "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
                className
            )}
            {...props}
        >
            {children}
            <Select.Icon render={<ChevronDownIcon className={"size-4 opacity-50"} />} />
        </Select.Trigger>
    );
};

const SelectContent = ({
    className,
    children,
    side = "bottom",
    sideOffset,
    align = "center",
    ...props
}: React.ComponentProps<typeof Select.Popup> & {
    side?: "top" | "bottom" | "left" | "right";
    sideOffset?: number;
    align?: "start" | "center" | "end";
}) => {
    return (
        <Select.Portal>
            <Select.Positioner side={side} sideOffset={sideOffset} align={align}>
                <Select.Popup
                    data-slot={"select-content"}
                    className={cn(
                        "relative z-50 max-h-[var(--available-height)] min-w-[8rem] origin-[var(--transform-origin)] overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[popup=closed]:animate-out data-[popup=closed]:fade-out-0 data-[popup=closed]:zoom-out-95 data-[popup=open]:animate-in data-[popup=open]:fade-in-0 data-[popup=open]:zoom-in-95",
                        className
                    )}
                    {...props}
                >
                    <SelectScrollUpButton />
                    <Select.List className="p-1">
                        {children}
                    </Select.List>
                    <SelectScrollDownButton />
                </Select.Popup>
            </Select.Positioner>
        </Select.Portal>
    );
};

const SelectLabel = ({
    className,
    ...props
}: React.ComponentProps<typeof Select.GroupLabel>) => {
    return (
        <Select.GroupLabel
            className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
            data-slot={"select-label"}
            {...props}/>
    );
};

const SelectItem = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof Select.Item>) => {
    return (
        <Select.Item
            data-slot={"select-item"}
            className={cn(
                "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                className
            )}
            {...props}
        >
            <span
                className={"absolute right-2 flex size-3.5 items-center justify-center"}
                data-slot={"select-item-indicator"}
            >
                <Select.ItemIndicator>
                    <CheckIcon className={"size-4"}/>
                </Select.ItemIndicator>
            </span>
            <Select.ItemText>
                {children}
            </Select.ItemText>
        </Select.Item>
    );
};

const SelectSeparator = ({
    className,
    ...props
}: React.ComponentProps<"div">) => {
    return (
        <div
            className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
            data-slot={"select-separator"}
            role="separator"
            {...props}/>
    );
};

const SelectScrollUpButton = ({
    className,
    ...props
}: React.ComponentProps<typeof Select.ScrollUpArrow>) => {
    return (
        <Select.ScrollUpArrow
            data-slot={"select-scroll-up-button"}
            className={cn(
                "flex cursor-default items-center justify-center py-1",
                className
            )}
            {...props}
        >
            <ChevronUpIcon className={"size-4"}/>
        </Select.ScrollUpArrow>
    );
};

const SelectScrollDownButton = ({
    className,
    ...props
}: React.ComponentProps<typeof Select.ScrollDownArrow>) => {
    return (
        <Select.ScrollDownArrow
            data-slot={"select-scroll-down-button"}
            className={cn(
                "flex cursor-default items-center justify-center py-1",
                className
            )}
            {...props}
        >
            <ChevronDownIcon className={"size-4"}/>
        </Select.ScrollDownArrow>
    );
};

// Re-export with original names that consumers expect
// Select component is exported as the Root, so we alias it
const SelectComponent = SelectRoot;

export {
    SelectComponent as Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
};
