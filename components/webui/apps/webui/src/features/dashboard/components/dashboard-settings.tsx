import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {useNavigate} from "react-router";

import {useQueryClient} from "@tanstack/react-query";
import {
    Trash2,
    X,
} from "lucide-react";

import {deleteDashboard} from "../api/dashboard-api";
import {useDashboardLayoutStore} from "../stores/layout-store";
import {VariableEditor} from "./variable-editor";

import {Button} from "@/components/ui/button";


type SettingsTab = "general" | "variables" | "json";

const TABS: {id: SettingsTab; label: string}[] = [
    {id: "general", label: "General"},
    {id: "variables", label: "Variables"},
    {id: "json", label: "JSON Model"},
];

interface DashboardSettingsProps {
    open: boolean;
    onClose: () => void;
}

/**
 *
 * @param root0
 * @param root0.open
 * @param root0.onClose
 */
export const DashboardSettings = ({open, onClose}: DashboardSettingsProps) => {
    const dashboard = useDashboardLayoutStore((s) => s.dashboard);
    const [activeTab, setActiveTab] = useState<SettingsTab>("general");

    if (!open || !dashboard) {
        return null;
    }

    return (
        <div
            className={"fixed inset-0 z-50 flex items-center justify-center bg-black/50"}
            onClick={onClose}
        >
            <div
                className={"bg-background rounded-lg border shadow-xl flex"}
                style={{width: "min(900px, 90vw)", height: "min(600px, 80vh)"}}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                {/* Left tab list */}
                <div className={"w-40 border-r bg-muted/30 flex flex-col py-2 shrink-0"}>
                    <div className={"px-3 py-2 text-sm font-semibold text-muted-foreground mb-1"}>Settings</div>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type={"button"}
                            className={`px-3 py-1.5 text-sm text-left transition-colors ${
                                activeTab === tab.id ?
                                    "bg-accent text-accent-foreground font-medium" :
                                    "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            }`}
                            onClick={() => {
                                setActiveTab(tab.id);
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content area */}
                <div className={"flex-1 flex flex-col overflow-hidden"}>
                    <div className={"flex items-center justify-between px-6 py-3 border-b"}>
                        <h2 className={"text-base font-semibold"}>
                            {TABS.find((t) => t.id === activeTab)?.label}
                        </h2>
                        <button
                            className={"inline-flex items-center justify-center size-7 rounded hover:bg-accent"}
                            type={"button"}
                            onClick={onClose}
                        >
                            <X className={"size-4"}/>
                        </button>
                    </div>

                    <div className={"flex-1 overflow-auto p-6"}>
                        {"general" === activeTab && (
                            <GeneralSettings/>
                        )}
                        {"variables" === activeTab && (
                            <VariableEditor/>
                        )}
                        {"json" === activeTab && (
                            <JsonModel/>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 *
 */
const GeneralSettings = () => {
    const dashboard = useDashboardLayoutStore((s) => s.dashboard);
    const setDashboard = useDashboardLayoutStore((s) => s.setDashboard);

    if (!dashboard) {
        return null;
    }

    return (
        <div className={"space-y-5 max-w-lg"}>
            <div>
                <label className={"text-xs text-muted-foreground"}>Title</label>
                <input
                    className={"w-full h-8 mt-1 rounded border border-input bg-background px-3 text-sm"}
                    type={"text"}
                    value={dashboard.title}
                    onChange={(e) => {
                        setDashboard({...dashboard, title: e.target.value});
                    }}/>
            </div>

            <div>
                <label className={"text-xs text-muted-foreground"}>Description</label>
                <textarea
                    className={"w-full h-20 mt-1 rounded border border-input bg-background px-3 py-2 text-sm resize-none"}
                    value={dashboard.description ?? ""}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                            setDashboard({...dashboard, description: val});
                        } else {
                            const {description: _, ...rest} = dashboard;
                            setDashboard(rest);
                        }
                    }}/>
            </div>

            <div>
                <label className={"text-xs text-muted-foreground"}>Tags (comma-separated)</label>
                <input
                    className={"w-full h-8 mt-1 rounded border border-input bg-background px-3 text-sm"}
                    type={"text"}
                    value={dashboard.tags.join(", ")}
                    onChange={(e) => {
                        const tags = e.target.value.split(",").map((s) => s.trim())
                            .filter(Boolean);

                        setDashboard({...dashboard, tags});
                    }}/>
            </div>

            <div>
                <label className={"text-xs text-muted-foreground"}>UID</label>
                <div className={"mt-1 text-sm text-muted-foreground font-mono"}>
                    {dashboard.uid}
                </div>
            </div>

            <div>
                <label className={"text-xs text-muted-foreground"}>Version</label>
                <div className={"mt-1 text-sm text-muted-foreground"}>
                    {dashboard.version}
                </div>
            </div>

            <div>
                <label className={"text-xs text-muted-foreground"}>Created</label>
                <div className={"mt-1 text-sm text-muted-foreground"}>
                    {dashboard.createdAt}
                </div>
            </div>

            <div>
                <label className={"text-xs text-muted-foreground"}>Updated</label>
                <div className={"mt-1 text-sm text-muted-foreground"}>
                    {dashboard.updatedAt}
                </div>
            </div>

            <DangerZone uid={dashboard.uid}/>
        </div>
    );
};

/**
 *
 * @param root0
 * @param root0.uid
 */
const DangerZone = ({uid}: {uid: string}) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteDashboard(uid);
            queryClient.invalidateQueries({queryKey: ["dashboards"]});
            navigate("/dashboards");
        } catch {
            setDeleting(false);
            setConfirming(false);
        }
    };

    return (
        <div className={"pt-4 mt-4 border-t border-destructive/30"}>
            <label className={"text-xs text-destructive font-medium"}>Danger Zone</label>
            <div className={"mt-2 flex items-center gap-3"}>
                {confirming ?
                    (
                        <>
                            <p className={"text-sm text-muted-foreground"}>This action cannot be undone.</p>
                            <Button
                                className={"text-destructive"}
                                disabled={deleting}
                                size={"sm"}
                                variant={"outline"}
                                onClick={handleDelete}
                            >
                                <Trash2 className={"size-3.5"}/>
                                {deleting ?
                                    "Deleting..." :
                                    "Confirm Delete"}
                            </Button>
                            <Button
                                disabled={deleting}
                                size={"sm"}
                                variant={"ghost"}
                                onClick={() => {
                                    setConfirming(false);
                                }}
                            >
                                Cancel
                            </Button>
                        </>
                    ) :
                    (
                        <Button
                            className={"text-destructive hover:bg-destructive/10"}
                            size={"sm"}
                            variant={"outline"}
                            onClick={() => {
                                setConfirming(true);
                            }}
                        >
                            <Trash2 className={"size-3.5"}/>
                            Delete Dashboard
                        </Button>
                    )}
            </div>
        </div>
    );
};

/**
 *
 */
const JsonModel = () => {
    const dashboard = useDashboardLayoutStore((s) => s.dashboard);
    const setDashboard = useDashboardLayoutStore((s) => s.setDashboard);
    const [jsonText, setJsonText] = useState("");
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const model = useMemo(() => {
        if (!dashboard) {
            return null;
        }

        return {
            title: dashboard.title,
            description: dashboard.description,
            tags: dashboard.tags,
            variables: dashboard.variables,
            timeRange: dashboard.timeRange,
            refreshInterval: dashboard.refreshInterval,
            panels: dashboard.panels,
            tabs: dashboard.tabs,
            annotations: dashboard.annotations,
        };
    }, [dashboard]);

    useEffect(() => {
        if (model && !dirty) {
            setJsonText(JSON.stringify(model, null, 2));
        }
    }, [model,
        dirty]);

    if (!dashboard || !model) {
        return null;
    }

    const applyChanges = () => {
        try {
            const parsed = JSON.parse(jsonText);
            setDashboard({...dashboard, ...parsed, id: dashboard.id, uid: dashboard.uid, version: dashboard.version});
            setDirty(false);
            setError(null);
        } catch (e) {
            setError((e as Error).message);
        }
    };

    return (
        <div className={"space-y-3 h-full flex flex-col"}>
            <textarea
                className={"flex-1 w-full rounded border border-input bg-background px-3 py-2 text-xs font-mono resize-none"}
                value={jsonText}
                onChange={(e) => {
                    setJsonText(e.target.value); setDirty(true); setError(null);
                }}/>
            {error && (
                <div className={"text-xs text-destructive"}>
                    {error}
                </div>
            )}
            <div className={"flex justify-end"}>
                <button
                    className={"px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"}
                    type={"button"}
                    onClick={applyChanges}
                >
                    Apply Changes
                </button>
            </div>
        </div>
    );
};
