import {
    ChevronDown,
    ChevronRight,
} from "lucide-react";

import type {PanelComponentProps} from "../plugins/registry";


/**
 *
 * @param root0
 * @param root0.options
 */
export const RowPanel = ({options}: PanelComponentProps) => {
    const collapsed = (options["collapsed"] as boolean) ?? false;
    const Icon = collapsed ?
        ChevronRight :
        ChevronDown;

    return (
        <div className={"flex items-center gap-2 h-full text-muted-foreground text-sm"}>
            <Icon className={"size-4"}/>
            <span>
                {collapsed ?
                    "Collapsed" :
                    "Expanded"}
            </span>
        </div>
    );
};
