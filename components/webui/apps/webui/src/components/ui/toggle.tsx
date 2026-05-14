import * as React from "react";

import {Toggle} from "@base-ui/react/toggle";
import {
    cva,
    type VariantProps,
} from "class-variance-authority";

import {cn} from "@/lib/utils";


const toggleVariants = cva(
    [
        "inline-flex items-center justify-center gap-2 rounded-md",
        "text-sm font-medium whitespace-nowrap",
        "transition-[color,box-shadow] outline-none",
        "hover:bg-muted hover:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-[3px]",
        "focus-visible:ring-ring/50 disabled:pointer-events-none",
        "disabled:opacity-50 data-[pressed]:bg-accent",
        "data-[pressed]:text-accent-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-4",
    ],
    {
        defaultVariants: {
            size: "default",
            variant: "default",
        },
        variants: {
            size: {
                default: "h-9 min-w-9 px-2",
                sm: "h-8 min-w-8 px-1.5",
                lg: "h-10 min-w-10 px-2.5",
            },
            variant: {
                default: "bg-transparent",
                outline: [
                    "border border-input bg-transparent",
                    "shadow-xs hover:bg-accent hover:text-accent-foreground",
                ],
            },
        },
    },
);

/**
 *
 * @param root0
 * @param root0.className
 * @param root0.variant
 * @param root0.size
 */
const ToggleButton = ({
    className,
    variant,
    size,
    ...props
}: React.ComponentProps<typeof Toggle> &
  VariantProps<typeof toggleVariants>) => {
    return (
        <Toggle
            className={cn(toggleVariants({className, size, variant}))}
            {...props}/>
    );
};

export {
    ToggleButton as Toggle, toggleVariants,
};
