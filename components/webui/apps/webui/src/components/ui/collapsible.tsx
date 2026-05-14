import * as React from "react";

import {Collapsible} from "@base-ui/react/collapsible";


/**
 *
 * @param root0
 */
const CollapsibleRoot = ({
    ...props
}: React.ComponentProps<typeof Collapsible.Root>) => {
    return (
        <Collapsible.Root
            data-slot={"collapsible"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 */
const CollapsibleTrigger = ({
    ...props
}: React.ComponentProps<typeof Collapsible.Trigger>) => {
    return (
        <Collapsible.Trigger
            data-slot={"collapsible-trigger"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 */
const CollapsibleContent = ({
    ...props
}: React.ComponentProps<typeof Collapsible.Panel>) => {
    return (
        <Collapsible.Panel
            data-slot={"collapsible-content"}
            {...props}/>
    );
};

export {
    CollapsibleRoot as Collapsible, CollapsibleContent, CollapsibleTrigger,
};
