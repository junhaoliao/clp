import * as React from "react";

import {ScrollArea} from "@base-ui/react/scroll-area";

import {cn} from "@/lib/utils";


/**
 *
 * @param root0
 * @param root0.className
 * @param root0.children
 */
const ScrollAreaRoot = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof ScrollArea.Root>) => {
    return (
        <ScrollArea.Root
            className={cn("relative", className)}
            data-slot={"scroll-area"}
            {...props}
        >
            <ScrollArea.Viewport
                className={"size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"}
                data-slot={"scroll-area-viewport"}
            >
                {children}
            </ScrollArea.Viewport>
            <ScrollBar/>
            <ScrollArea.Corner/>
        </ScrollArea.Root>
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
}: React.ComponentProps<typeof ScrollArea.Scrollbar>) => {
    return (
        <ScrollArea.Scrollbar
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
            <ScrollArea.Thumb
                className={"relative flex-1 rounded-full bg-border"}
                data-slot={"scroll-area-thumb"}/>
        </ScrollArea.Scrollbar>
    );
};

export {
    ScrollAreaRoot as ScrollArea, ScrollBar,
};
