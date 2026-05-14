import * as React from "react";

import {Combobox} from "@base-ui/react/combobox";
import {
    CheckIcon,
    ChevronDownIcon,
} from "lucide-react";

import {cn} from "@/lib/utils";


const ComboboxRoot = ({
    ...props
}: React.ComponentProps<typeof Combobox.Root>) => {
    return (
        <Combobox.Root
            data-slot={"combobox"}
            {...props}
        />
    );
};

const ComboboxInput = ({
    className,
    ...props
}: React.ComponentProps<typeof Combobox.Input>) => {
    return (
        <Combobox.Input
            className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent",
                "px-3 py-2 text-sm shadow-xs",
                "transition-[color,box-shadow] outline-none",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "placeholder:text-muted-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            data-slot={"combobox-input"}
            {...props}
        />
    );
};

const ComboboxTrigger = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof Combobox.Trigger>) => {
    return (
        <Combobox.Trigger
            className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input",
                "bg-transparent px-3 py-2 text-sm shadow-xs",
                "transition-[color,box-shadow] outline-none",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "placeholder:text-muted-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            data-slot={"combobox-trigger"}
            {...props}
        >
            {children}
            <Combobox.Icon
                render={<ChevronDownIcon className={"size-4 opacity-50"}/>}
            />
        </Combobox.Trigger>
    );
};

const ComboboxContent = ({
    className,
    children,
    side = "bottom",
    sideOffset = 4,
    align = "start",
    ...props
}: React.ComponentProps<typeof Combobox.Positioner> & {
    side?: "top" | "bottom" | "left" | "right";
    sideOffset?: number;
    align?: "start" | "center" | "end";
}) => {
    return (
        <Combobox.Portal>
            <Combobox.Positioner
                align={align}
                side={side}
                sideOffset={sideOffset}
            >
                <Combobox.Popup
                    className={cn(
                        "relative z-50 max-h-72 min-w-[8rem] overflow-x-hidden overflow-y-auto",
                        "rounded-md border bg-popover text-popover-foreground shadow-md",
                        "data-[side=bottom]:slide-in-from-top-2",
                        "data-[side=left]:slide-in-from-right-2",
                        "data-[side=right]:slide-in-from-left-2",
                        "data-[side=top]:slide-in-from-bottom-2",
                        "data-[popup=closed]:animate-out data-[popup=closed]:fade-out-0",
                        "data-[popup=closed]:zoom-out-95",
                        "data-[popup=open]:animate-in data-[popup=open]:fade-in-0",
                        "data-[popup=open]:zoom-in-95",
                        className,
                    )}
                    data-slot={"combobox-content"}
                    {...props}
                >
                    {children}
                </Combobox.Popup>
            </Combobox.Positioner>
        </Combobox.Portal>
    );
};

const ComboboxList = ({
    className,
    ...props
}: React.ComponentProps<typeof Combobox.List>) => {
    return (
        <Combobox.List
            className={cn("p-1", className)}
            data-slot={"combobox-list"}
            {...props}
        />
    );
};

const ComboboxItem = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof Combobox.Item>) => {
    return (
        <Combobox.Item
            className={cn(
                "relative flex w-full cursor-default items-center gap-2",
                "rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden",
                "select-none focus:bg-accent focus:text-accent-foreground",
                "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                className,
            )}
            data-slot={"combobox-item"}
            {...props}
        >
            <span
                className={"absolute right-2 flex size-3.5 items-center justify-center"}
                data-slot={"combobox-item-indicator"}
            >
                <Combobox.ItemIndicator>
                    <CheckIcon className={"size-4"}/>
                </Combobox.ItemIndicator>
            </span>
            {children}
        </Combobox.Item>
    );
};

const ComboboxEmpty = ({
    className,
    ...props
}: React.ComponentProps<typeof Combobox.Empty>) => {
    return (
        <Combobox.Empty
            className={cn("py-6 text-center text-sm", className)}
            data-slot={"combobox-empty"}
            {...props}
        />
    );
};

const ComboboxGroup = ({
    className,
    ...props
}: React.ComponentProps<typeof Combobox.Group>) => {
    return (
        <Combobox.Group
            className={cn("overflow-hidden p-1 text-foreground", className)}
            data-slot={"combobox-group"}
            {...props}
        />
    );
};

const ComboboxGroupLabel = ({
    className,
    ...props
}: React.ComponentProps<typeof Combobox.GroupLabel>) => {
    return (
        <Combobox.GroupLabel
            className={cn(
                "px-2 py-1.5 text-xs font-medium text-muted-foreground",
                className,
            )}
            data-slot={"combobox-group-label"}
            {...props}
        />
    );
};

export {
    ComboboxRoot as Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxGroupLabel,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxTrigger,
};
