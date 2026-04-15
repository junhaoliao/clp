import * as React from "react";

import {Popover as PopoverPrimitive} from "radix-ui";

import {cn} from "@/lib/utils";


/**
 *
 * @param root0
 */
const Popover = ({
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) => {
    return (
        <PopoverPrimitive.Root
            data-slot={"popover"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 */
const PopoverTrigger = ({
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) => {
    return (
        <PopoverPrimitive.Trigger
            data-slot={"popover-trigger"}
            {...props}/>
    );
};

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
}: React.ComponentProps<typeof PopoverPrimitive.Content>) => {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                align={align}
                data-slot={"popover-content"}
                sideOffset={sideOffset}
                className={cn(
                    "z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                    className
                )}
                {...props}/>
        </PopoverPrimitive.Portal>
    );
};

/**
 *
 * @param root0
 */
const PopoverAnchor = ({
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) => {
    return (
        <PopoverPrimitive.Anchor
            data-slot={"popover-anchor"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 */
const PopoverHeader = ({className, ...props}: React.ComponentProps<"div">) => {
    return (
        <div
            className={cn("flex flex-col gap-1 text-sm", className)}
            data-slot={"popover-header"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 */
const PopoverTitle = ({className, ...props}: React.ComponentProps<"h2">) => {
    return (
        <div
            className={cn("font-medium", className)}
            data-slot={"popover-title"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 */
const PopoverDescription = ({
    className,
    ...props
}: React.ComponentProps<"p">) => {
    return (
        <p
            className={cn("text-muted-foreground", className)}
            data-slot={"popover-description"}
            {...props}/>
    );
};

export {
    Popover,
    PopoverAnchor,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
};
