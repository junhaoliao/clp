import * as React from "react";

import {Tooltip as TooltipPrimitive} from "@base-ui/react/tooltip";

import {cn} from "@/lib/utils";


const TooltipProvider = ({
    delay = 0,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) => {
    return (
        <TooltipPrimitive.Provider
            data-slot={"tooltip-provider"}
            delay={delay}
            {...props}/>
    );
};

const Tooltip = ({
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) => {
    return (
        <TooltipPrimitive.Root
            data-slot={"tooltip"}
            {...props}/>
    );
};

const TooltipTrigger = ({
    asChild,
    children,
    delay = 0,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger> & {
    asChild?: boolean;
}) => {
    return (
        <TooltipPrimitive.Trigger
            data-slot={"tooltip-trigger"}
            delay={delay}
            render={asChild && React.isValidElement(children) ? children : undefined}
            {...props}
        >
            {asChild ? undefined : children}
        </TooltipPrimitive.Trigger>
    );
};

const TooltipContent = ({
    className,
    sideOffset = 0,
    side = "top",
    align,
    children,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> & {
    side?: "top" | "bottom" | "left" | "right";
    sideOffset?: number;
    align?: "start" | "center" | "end";
}) => {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Positioner
                side={side}
                sideOffset={sideOffset}
                align={align}
            >
                <TooltipPrimitive.Popup
                    data-slot={"tooltip-content"}
                    className={cn(
                        "z-50 w-fit origin-(--transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[popup=closed]:animate-out data-[popup=closed]:fade-out-0 data-[popup=closed]:zoom-out-95",
                        className
                    )}
                    {...props}
                >
                    {children}
                    <TooltipPrimitive.Arrow className={"z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground"}/>
                </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
    );
};

export {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
};
