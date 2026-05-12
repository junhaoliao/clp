import {
    Suspense,
    useCallback,
    useEffect,
    useState,
} from "react";

import type {DashboardPanel} from "@webui/common/dashboard/types";
import {X} from "lucide-react";

import {parseTimeRange} from "../hooks/parse-time-range";
import {usePanelQueries} from "../hooks/use-panel-queries";
import {
    interpolateVariables,
    resolveVariables,
} from "../hooks/variable-interpolation";
import {getPanelPlugin} from "../plugins/registry";
import {useDashboardLayoutStore} from "../stores/layout-store";
import {useDashboardTimeStore} from "../stores/time-store";
import {useDashboardVariableStore} from "../stores/variable-store";
import {PanelChrome} from "./panel-chrome";


interface FullScreenPanelProps {
    panel: DashboardPanel;
    onClose: () => void;
}

/**
 *
 * @param root0
 * @param root0.panel
 * @param root0.onClose
 */
export const FullScreenPanel = ({panel, onClose}: FullScreenPanelProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ("Escape" === e.key) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    const plugin = getPanelPlugin(panel.type);
    const {data, state, error, refetch, isSlowQuery, rowsTruncated} = usePanelQueries(panel);
    const timeRange = useDashboardTimeStore((s) => s.timeRange);
    const setTimeRange = useDashboardTimeStore((s) => s.setTimeRange);
    const variableValues = useDashboardVariableStore((s) => s.variableValues);
    const dashboardUid = useDashboardLayoutStore((s) => s.dashboard?.uid ?? "");

    if (!plugin) {
        return null;
    }

    const PanelComponent = plugin.component;
    const resolvedVars = resolveVariables(variableValues, timeRange, dashboardUid);
    const replaceVariables = useCallback(
        (str: string) => interpolateVariables(str, resolvedVars),
        [resolvedVars],
    );

    const from = "now" === timeRange.from ?
        parseTimeRange("now") :
        parseTimeRange(timeRange.from);
    const to = "now" === timeRange.to ?
        parseTimeRange("now") :
        parseTimeRange(timeRange.to);

    return (
        <div className={"fixed inset-0 z-50 bg-background flex flex-col"}>
            <div className={"flex items-center justify-between border-b px-4 py-2"}>
                <h2 className={"text-lg font-semibold"}>
                    {panel.title}
                </h2>
                <button
                    className={"inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"}
                    type={"button"}
                    onClick={onClose}
                >
                    <X className={"size-4"}/>
                </button>
            </div>
            <div className={"flex-1 p-4"}>
                <PanelChrome
                    errorMessage={error ?? undefined}
                    isSlowQuery={isSlowQuery}
                    rowsTruncated={rowsTruncated}
                    state={state}
                    onRetry={refetch}
                >
                    <Suspense fallback={<div className={"flex items-center justify-center h-full text-muted-foreground text-xs"}>Loading panel...</div>}>
                        <PanelComponent
                            data={data}
                            fieldConfig={panel.fieldConfig}
                            height={window.innerHeight - 80}
                            id={panel.id}
                            options={{...plugin.defaultOptions?.(), ...panel.options}}
                            replaceVariables={replaceVariables}
                            timeRange={{from, to, raw: timeRange}}
                            transparent={false}
                            width={window.innerWidth - 32}
                            onOptionsChange={() => {
                            }}
                            onTimeRangeChange={(from: number, to: number) => {
                                setTimeRange(String(from), String(to));
                            }}/>
                    </Suspense>
                </PanelChrome>
            </div>
        </div>
    );
};

/**
 *
 */
export function useFullScreenPanel () {
    const [fullScreenPanel, setFullScreenPanel] = useState<DashboardPanel | null>(null);

    const openFullScreen = useCallback((panel: DashboardPanel) => {
        setFullScreenPanel(panel);
    }, []);

    const closeFullScreen = useCallback(() => {
        setFullScreenPanel(null);
    }, []);

    return {fullScreenPanel, openFullScreen, closeFullScreen};
}
