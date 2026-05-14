import * as React from "react";

import {
    cva,
    type VariantProps,
} from "class-variance-authority";
import { Tabs } from "@base-ui/react/tabs";

import {cn} from "@/lib/utils";


const TabsRoot = ({
    className,
    orientation = "horizontal",
    ...props
}: React.ComponentProps<typeof Tabs.Root>) => {
    return (
        <Tabs.Root
            data-orientation={orientation}
            data-slot={"tabs"}
            className={cn(
                "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
                className
            )}
            {...props}/>
    );
};

const tabsListVariants = cva(
    "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
    {
        variants: {
            variant: {
                default: "bg-muted",
                line: "gap-1 bg-transparent",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

const TabsList = ({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<typeof Tabs.List> &
  VariantProps<typeof tabsListVariants>) => {
    return (
        <Tabs.List
            className={cn(tabsListVariants({variant}), className)}
            data-slot={"tabs-list"}
            data-variant={variant}
            {...props}/>
    );
};

const TabsTrigger = ({
    className,
    ...props
}: React.ComponentProps<typeof Tabs.Tab>) => {
    return (
        <Tabs.Tab
            data-slot={"tabs-trigger"}
            className={cn(
                "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[selected]:shadow-sm group-data-[variant=line]/tabs-list:data-[selected]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[selected]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[selected]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[selected]:bg-transparent",
                "data-[selected]:bg-background data-[selected]:text-foreground dark:data-[selected]:border-input dark:data-[selected]:bg-input/30 dark:data-[selected]:text-foreground",
                "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[selected]:after:opacity-100",
                className
            )}
            {...props}/>
    );
};

const TabsContent = ({
    className,
    ...props
}: React.ComponentProps<typeof Tabs.Panel>) => {
    return (
        <Tabs.Panel
            className={cn("flex-1 outline-none", className)}
            data-slot={"tabs-content"}
            {...props}/>
    );
};

// Re-export with original names
const TabsExport = TabsRoot;

export {
    TabsExport as Tabs, TabsContent, TabsList, tabsListVariants, TabsTrigger,
};
