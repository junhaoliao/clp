import * as React from "react";

import {Popover} from "@base-ui/react/popover";

import {cn} from "@/lib/utils";


const PopoverRoot = Popover.Root;

const PopoverTrigger = Popover.Trigger;

const PopoverAnchor = Popover.Trigger;

/**
 *
 * @param root0
 * @param root0.className
 * @param root0.align
 * @param root0.sideOffset
 */
const PopoverContent = ({
    className,
    align = "center",
    sideOffset = 4,
    ...props
}: React.ComponentProps<typeof Popover.Positioner> & {
    align?: "center" | "start" | "end";
    sideOffset?: number;
}) => {
    return (
        <Popover.Portal>
            <Popover.Positioner
                align={align}
                className={"z-50"}
                sideOffset={sideOffset}
                {...props}
            >
                <Popover.Popup
                    className={cn(
                        "w-72 rounded-md border bg-popover p-4",
                        "text-popover-foreground shadow-md outline-none",
                        "data-[side=bottom]:slide-in-from-top-2",
                        "data-[side=left]:slide-in-from-right-2",
                        "data-[side=right]:slide-in-from-left-2",
                        "data-[side=top]:slide-in-from-bottom-2",
                        "data-[state=open]:animate-in",
                        "data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0",
                        "data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95",
                        "data-[state=open]:zoom-in-95",
                        className,
                    )}
                >
                    {props.children}
                </Popover.Popup>
            </Popover.Positioner>
        </Popover.Portal>
    );
};

export {
    PopoverRoot as Popover, PopoverAnchor, PopoverContent, PopoverTrigger,
};
