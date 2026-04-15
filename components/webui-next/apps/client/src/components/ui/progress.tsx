import * as React from "react";

import {Progress as ProgressPrimitive} from "radix-ui";

import {cn} from "@/lib/utils";


/**
 *
 * @param root0
 * @param root0.className
 * @param root0.value
 */
const Progress = ({
    className,
    value,
    ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) => {
    return (
        <ProgressPrimitive.Root
            data-slot={"progress"}
            className={cn(
                "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
                className
            )}
            {...props}
        >
            <ProgressPrimitive.Indicator
                className={"h-full w-full flex-1 bg-primary transition-all"}
                data-slot={"progress-indicator"}
                style={{transform: `translateX(-${100 - (value || 0)}%)`}}/>
        </ProgressPrimitive.Root>
    );
};

export {Progress};
