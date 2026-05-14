import type {DashboardTab} from "@webui/common/dashboard/types";

import {useDashboardLayoutStore} from "../stores/layout-store";


interface DashboardTabsProps {
    isEditing: boolean;
}

/**
 *
 * @param root0
 * @param root0.isEditing
 */
export const DashboardTabs = ({isEditing}: DashboardTabsProps) => {
    const dashboard = useDashboardLayoutStore((s) => s.dashboard);
    const activeTabId = useDashboardLayoutStore((s) => s.activeTabId);
    const setActiveTabId = useDashboardLayoutStore((s) => s.setActiveTabId);
    const addTab = useDashboardLayoutStore((s) => s.addTab);
    const removeTab = useDashboardLayoutStore((s) => s.removeTab);

    const tabs = dashboard?.tabs ?? [];

    if (0 === tabs.length) {
        return null;
    }

    return (
        <div className={"flex items-center gap-1 px-4 border-b bg-muted/30"}>
            {tabs
                .sort((a: DashboardTab, b: DashboardTab) => a.order - b.order)
                .map((tab: DashboardTab) => (
                    <button
                        key={tab.id}
                        type={"button"}
                        className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                            activeTabId === tab.id ?
                                "border-primary text-foreground" :
                                "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                        }`}
                        onClick={() => {
                            setActiveTabId(tab.id);
                        }}
                    >
                        {tab.title}
                        {isEditing && (
                            <span
                                className={"ml-1.5 text-muted-foreground hover:text-destructive"}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTab(tab.id);
                                }}
                            >
                                x
                            </span>
                        )}
                    </button>
                ))}
            {isEditing && (
                <button
                    className={"px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground border-b-2 border-transparent"}
                    type={"button"}
                    onClick={() => {
                        addTab(`Tab ${tabs.length + 1}`);
                    }}
                >
                    + Add Tab
                </button>
            )}
        </div>
    );
};
