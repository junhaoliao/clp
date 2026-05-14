import type {PanelType} from "@webui/common/dashboard/types";

import {getAllPanelPlugins} from "../plugins/registry";


interface AddPanelDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (type: PanelType) => void;
}

const ICON_MAP: Record<string, string> = {
    LineChart: "📈",
    Hash: "#",
    Table: "📊",
    BarChart3: "📊",
    FileText: "📄",
    FileCode: "📝",
    Gauge: "🎯",
    Grid3x3: "🟦",
    PieChart: "🥧",
};

/**
 *
 * @param root0
 * @param root0.open
 * @param root0.onClose
 * @param root0.onSelect
 */
export const AddPanelDialog = ({open, onClose, onSelect}: AddPanelDialogProps) => {
    if (!open) {
        return null;
    }

    const plugins = getAllPanelPlugins();

    return (
        <div
            className={"fixed inset-0 z-50 flex items-center justify-center bg-black/50"}
            onClick={onClose}
        >
            <div
                className={"bg-background rounded-xl border shadow-lg w-full max-w-md p-4"}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <h2 className={"text-lg font-semibold mb-3"}>Add Panel</h2>
                <div className={"grid grid-cols-3 gap-2"}>
                    {plugins.map((plugin) => (
                        <button
                            className={"flex flex-col items-center gap-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors"}
                            key={plugin.meta.type}
                            onClick={() => {
                                onSelect(plugin.meta.type);
                                onClose();
                            }}
                        >
                            <span className={"text-2xl"}>
                                {ICON_MAP[plugin.meta.icon] ?? "📦"}
                            </span>
                            <span className={"text-xs font-medium text-center"}>
                                {plugin.meta.name}
                            </span>
                        </button>
                    ))}
                </div>
                <button
                    className={"mt-4 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"}
                    onClick={onClose}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
