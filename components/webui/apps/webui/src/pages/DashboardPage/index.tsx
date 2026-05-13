import {
    useEffect,
    useState,
} from "react";
import {useParams} from "react-router";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type {PanelType} from "@webui/common/dashboard/types";
import {
    AlertTriangle,
    Download,
    Pencil,
    Plus,
    Redo2,
    RefreshCw,
    Save,
    Settings,
    Undo2,
    Upload,
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {
    getDashboard,
    updateDashboard,
} from "@/features/dashboard/api/dashboard-api";
import {
    downloadJson,
    exportDashboard,
    importDashboard,
} from "@/features/dashboard/api/export-import";
import {AddPanelDialog} from "@/features/dashboard/components/add-panel-dialog";
import {DashboardGrid} from "@/features/dashboard/components/dashboard-grid";
import {DashboardSettings} from "@/features/dashboard/components/dashboard-settings";
import {DashboardTabs} from "@/features/dashboard/components/dashboard-tabs";
import {
    FullScreenPanel,
    useFullScreenPanel,
} from "@/features/dashboard/components/full-screen-panel";
import {PanelOptionsEditor} from "@/features/dashboard/components/panel-options-editor";
import {ResizableSidebar} from "@/features/dashboard/components/resizable-sidebar";
import {TimeRangePicker} from "@/features/dashboard/components/time-range-picker";
import {VariableBar} from "@/features/dashboard/components/variable-bar";
import {useAutoRefresh} from "@/features/dashboard/hooks/use-auto-refresh";
import {useCascadingVariables} from "@/features/dashboard/hooks/use-cascading-variables";
import {usePanelErrorSummary} from "@/features/dashboard/hooks/use-panel-error-summary";
import {migratePanels} from "@/features/dashboard/plugins/migration";
import type {Annotation, DashboardPanel, DashboardTab} from "@webui/common/dashboard/types";
import {useDashboardLayoutStore} from "@/features/dashboard/stores/layout-store";


/**
 *
 * @param root0
 * @param root0.panels
 * @param root0.tabs
 * @param root0.isEditing
 * @param root0.annotations
 * @param root0.onFullScreen
 */
function FilteredDashboardGrid ({panels, tabs, isEditing, annotations, onFullScreen}: {
    annotations?: Annotation[];
    isEditing: boolean;
    onFullScreen: (panel: DashboardPanel) => void;
    panels: DashboardPanel[];
    tabs: DashboardTab[];
}) {
    const activeTabId = useDashboardLayoutStore((s) => s.activeTabId);

    const filteredPanels = 0 === tabs.length || !activeTabId ?
        panels :
        panels.filter((p) => p.tabId === activeTabId || undefined === p.tabId);

    return (
        <DashboardGrid
            annotations={annotations}
            isEditing={isEditing}
            panels={filteredPanels}
            onFullScreen={onFullScreen}/>
    );
}


/**
 *
 */
export const DashboardPage = () => {
    const {uid} = useParams();
    const queryClient = useQueryClient();
    const dashboard = useDashboardLayoutStore((s) => s.dashboard);
    const isEditing = useDashboardLayoutStore((s) => s.isEditing);
    const isDirty = useDashboardLayoutStore((s) => s.isDirty);
    const setDashboard = useDashboardLayoutStore((s) => s.setDashboard);
    const addPanel = useDashboardLayoutStore((s) => s.addPanel);
    const setEditing = useDashboardLayoutStore((s) => s.setEditing);
    const selectedPanelId = useDashboardLayoutStore((s) => s.selectedPanelId);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const {fullScreenPanel, openFullScreen, closeFullScreen} = useFullScreenPanel();
    const errorSummary = usePanelErrorSummary(dashboard?.panels ?? []);

    useAutoRefresh(() => {
        queryClient.invalidateQueries({queryKey: ["panelQuery"]});
    });

    useCascadingVariables(dashboard?.variables ?? []);

    const {data: fetchedDashboard} = useQuery({
        queryKey: ["dashboard",
            uid],
        queryFn: () => getDashboard(uid!),
        enabled: Boolean(uid),
    });

    useEffect(() => {
        if (fetchedDashboard) {
            const panels = migratePanels(fetchedDashboard.panels);
            setDashboard({...fetchedDashboard, panels});
        }
    }, [fetchedDashboard,
        setDashboard]);

    const saveMutation = useMutation({
        mutationFn: () => {
            if (!dashboard || !uid) {
                throw new Error("No dashboard to save");
            }

            return updateDashboard(uid, {
                title: dashboard.title,
                panels: dashboard.panels,
                variables: dashboard.variables,
                timeRange: dashboard.timeRange,
                tabs: dashboard.tabs,
                tags: dashboard.tags,
                version: dashboard.version,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["dashboard",
                uid]});
            queryClient.invalidateQueries({queryKey: ["dashboards"]});
        },
    });

    if (!dashboard) {
        return <div className={"flex items-center justify-center h-full text-muted-foreground"}>Loading...</div>;
    }

    return (
        <div className={"flex flex-col h-full"}>
            <div className={"flex items-center justify-between border-b px-4 py-2 bg-background"}>
                <div className={"flex items-center gap-3"}>
                    <h1 className={"text-lg font-semibold"}>
                        {dashboard.title}
                    </h1>
                    {isDirty && <span className={"text-xs text-muted-foreground"}>(unsaved)</span>}
                    {errorSummary.hasErrors && (
                        <span className={"text-xs text-destructive"}>
                            {errorSummary.errorCount}
                            {" "}
                            of
                            {errorSummary.totalPanels}
                            {" "}
                            panels failed
                        </span>
                    )}
                </div>
                <div className={"flex items-center gap-2"}>
                    <TimeRangePicker/>
                    <div className={"border-l h-6 mx-2"}/>
                    {isEditing ?
                        (
                            <>
                                <Button
                                    size={"sm"}
                                    variant={"outline"}
                                    onClick={() => {
                                        setShowAddPanel(true);
                                    }}
                                >
                                    <Plus className={"size-4"}/>
                                    {" "}
                                    Add Panel
                                </Button>
                                <Button
                                    size={"sm"}
                                    variant={"outline"}
                                    onClick={() => {
                                        useDashboardLayoutStore.temporal.getState().undo();
                                    }}
                                >
                                    <Undo2 className={"size-4"}/>
                                </Button>
                                <Button
                                    size={"sm"}
                                    variant={"outline"}
                                    onClick={() => {
                                        useDashboardLayoutStore.temporal.getState().redo();
                                    }}
                                >
                                    <Redo2 className={"size-4"}/>
                                </Button>
                                <Button
                                    size={"sm"}
                                    variant={"ghost"}
                                    onClick={() => {
                                        setShowSettings(true);
                                    }}
                                >
                                    <Settings className={"size-4"}/>
                                </Button>
                                <Button
                                    disabled={!isDirty || saveMutation.isPending}
                                    size={"sm"}
                                    onClick={() => {
                                        saveMutation.mutate();
                                    }}
                                >
                                    <Save className={"size-4"}/>
                                    {" "}
                                    Save
                                </Button>
                                <Button
                                    size={"sm"}
                                    variant={"ghost"}
                                    onClick={() => {
                                        setEditing(false);
                                    }}
                                >
                                    Close
                                </Button>
                            </>
                        ) :
                        (
                            <>
                                <Button
                                    size={"sm"}
                                    variant={"outline"}
                                    onClick={() => {
                                        queryClient.invalidateQueries({queryKey: ["panelQuery"]});
                                    }}
                                >
                                    <RefreshCw className={"size-4"}/>
                                    {" "}
                                    Refresh
                                </Button>
                                {errorSummary.hasErrors && (<Button
                                    size={"sm"}
                                    variant={"ghost"}
                                    onClick={() => {
                                        queryClient.resetQueries({queryKey: ["panelQuery"]});
                                    }}
                                >
                                    <AlertTriangle className={"size-4"}/>
                                    {" "}
                                    Retry Failed
                                </Button>)}
                                <Button
                                    size={"sm"}
                                    variant={"outline"}
                                    onClick={() => {
                                        setEditing(true);
                                    }}
                                >
                                    <Pencil className={"size-4"}/>
                                    {" "}
                                    Edit
                                </Button>
                                <Button
                                    size={"sm"}
                                    variant={"ghost"}
                                    onClick={() => {
                                        setShowSettings(true);
                                    }}
                                >
                                    <Settings className={"size-4"}/>
                                </Button>
                                <Button
                                    size={"sm"}
                                    variant={"ghost"}
                                    onClick={() => {
                                        const json = exportDashboard(dashboard);
                                        downloadJson(json, `${dashboard.title}.json`);
                                    }}
                                >
                                    <Download className={"size-4"}/>
                                </Button>
                                <label className={"cursor-pointer"}>
                                    <input
                                        accept={".json"}
                                        className={"hidden"}
                                        type={"file"}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) {
                                                return;
                                            }
                                            file.text().then((text) => {
                                                const {dashboard: imported, error} = importDashboard(text);
                                                if (error) {
                                                    alert(error);

                                                    return;
                                                }
                                                if (imported.title) {
                                                    setDashboard({...dashboard, ...imported, id: dashboard.id, uid: dashboard.uid, version: dashboard.version});
                                                }
                                            });
                                        }}/>
                                    <span className={"inline-flex items-center justify-center h-8 px-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"}>
                                        <Upload className={"size-4"}/>
                                    </span>
                                </label>

                            </>
                        )}
                </div>
            </div>

            {0 < dashboard.variables.length && (
                <VariableBar variables={dashboard.variables}/>
            )}

            <DashboardTabs isEditing={isEditing}/>

            <div className={"flex-1 flex overflow-hidden"}>
                <div className={"flex-1 overflow-auto bg-muted/30"}>
                    <FilteredDashboardGrid
                        {...(dashboard.annotations ? {annotations: dashboard.annotations} : {})}
                        isEditing={isEditing}
                        panels={dashboard.panels}
                        tabs={dashboard.tabs ?? []}
                        onFullScreen={openFullScreen}/>
                </div>

                {isEditing && selectedPanelId && (
                    <ResizableSidebar side="right">
                        <PanelOptionsEditor/>
                    </ResizableSidebar>
                )}
            </div>

            <AddPanelDialog
                open={showAddPanel}
                onClose={() => {
                    setShowAddPanel(false);
                }}
                onSelect={(type: PanelType) => {
                    addPanel(type);
                }}/>

            {fullScreenPanel && (
                <FullScreenPanel
                    panel={fullScreenPanel}
                    onClose={closeFullScreen}/>
            )}

            <DashboardSettings
                key={showSettings ? "open" : "closed"}
                open={showSettings}
                onClose={() => {
                    setShowSettings(false);
                }}/>
        </div>
    );
};
