"use client";

import * as React from "react";

import {ScrollArea as ScrollAreaPrimitive} from "radix-ui";

import {cn} from "@/lib/utils";


/**
 *
 * @param root0
 * @param root0.className
 * @param root0.children
 */
const ScrollArea = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) => {
    return (
        <ScrollAreaPrimitive.Root
            className={cn("relative", className)}
            data-slot={"scroll-area"}
            {...props}
        >
            <ScrollAreaPrimitive.Viewport
                className={"size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"}
                data-slot={"scroll-area-viewport"}
            >
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar/>
            <ScrollAreaPrimitive.Corner/>
        </ScrollAreaPrimitive.Root>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 * @param root0.orientation
 */
const ScrollBar = ({
    className,
    orientation = "vertical",
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) => {
    return (
        <ScrollAreaPrimitive.ScrollAreaScrollbar
            data-slot={"scroll-area-scrollbar"}
            orientation={orientation}
            className={cn(
                "flex touch-none p-px transition-colors select-none",
                "vertical" === orientation &&
          "h-full w-2.5 border-l border-l-transparent",
                "horizontal" === orientation &&
          "h-2.5 flex-col border-t border-t-transparent",
                className
            )}
            {...props}
        >
            <ScrollAreaPrimitive.ScrollAreaThumb
                className={"relative flex-1 rounded-full bg-border"}
                data-slot={"scroll-area-thumb"}/>
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
    );
};

export {
    ScrollArea, ScrollBar,
};
