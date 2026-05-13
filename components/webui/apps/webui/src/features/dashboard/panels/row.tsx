import type {PanelComponentProps} from "../plugins/registry";
import {ChevronRight, ChevronDown} from "lucide-react";

export function RowPanel({options}: PanelComponentProps) {
  const collapsed = (options["collapsed"] as boolean) ?? false;
  const Icon = collapsed ? ChevronRight : ChevronDown;

  return (
    <div className="flex items-center gap-2 h-full text-muted-foreground text-sm">
      <Icon className="size-4" />
      <span>{collapsed ? "Collapsed" : "Expanded"}</span>
    </div>
  );
}
