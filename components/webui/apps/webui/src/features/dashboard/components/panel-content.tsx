import {
    Suspense,
    useCallback,
} from "react";

import type {DashboardPanel} from "@webui/common/dashboard/types";

import {parseTimeRange} from "../hooks/parse-time-range";
import {usePanelQueries} from "../hooks/use-panel-queries";
import {truncateDataForDisplay} from "../hooks/truncate-display-data";
import {
    interpolateVariables,
    resolveVariables,
} from "../hooks/variable-interpolation";
import {EmptyState} from "../panels/charts";
import {getPanelPlugin} from "../plugins/registry";
import {useDashboardLayoutStore} from "../stores/layout-store";
import {useDashboardTimeStore} from "../stores/time-store";
import {useDashboardVariableStore} from "../stores/variable-store";
import {PanelChrome} from "./panel-chrome";


const MIN_PANEL_HEIGHT = 200;

interface PanelContentProps {
    panel: DashboardPanel;
    width: number;
    height: number;
    isVisible: boolean;
    annotations?: ({id: string; time: number; timeEnd?: number; title: string; tags?: string[]; color?: string}[] | undefined);
}

export const PanelContent = ({panel, width, height, isVisible, annotations}: PanelContentProps) => {
    const plugin = getPanelPlugin(panel.type);
    const requiresQuery = false !== plugin?.meta.requiresQuery || true === panel.options["enableDataBinding"];
    const {data, state, error, refetch, isRefetching, isSlowQuery, rowsTruncated} = usePanelQueries(panel, {enabled: requiresQuery && isVisible, panelWidthPx: width});
    const timeRange = useDashboardTimeStore((s) => s.timeRange);
    const setTimeRange = useDashboardTimeStore((s) => s.setTimeRange);
    const variableValues = useDashboardVariableStore((s) => s.variableValues);
    const dashboardUid = useDashboardLayoutStore((s) => s.dashboard?.uid ?? "");

    const resolvedVars = resolveVariables(variableValues, timeRange, dashboardUid, width);
    const replaceVariables = useCallback((str: string) => interpolateVariables(str, resolvedVars), [resolvedVars]);

    const from = "now" === timeRange.from ?
        parseTimeRange("now") :
        parseTimeRange(timeRange.from);
    const to = "now" === timeRange.to ?
        parseTimeRange("now") :
        parseTimeRange(timeRange.to);

    const handleTimeRangeChange = (newFrom: number, newTo: number) => {
        setTimeRange(String(newFrom), String(newTo));
    };

    if (!plugin) {
        return <EmptyState message={`Unknown panel type: ${panel.type}`}/>;
    }

    if (!isVisible) {
        return (
            <div
                className={"h-full"}
                style={{minHeight: 0 < height ?
                    height :
                    MIN_PANEL_HEIGHT}}/>
        );
    }

    const PanelComponent = plugin.component;
    const isTablePanel = "table" === panel.type;
    const displayData = isTablePanel ?
        data :
        truncateDataForDisplay(data);
    const panelState = requiresQuery ?
        state :
        "data";

    return (
        <PanelChrome
            errorMessage={error ?? undefined}
            isRefetching={isRefetching}
            isSlowQuery={isSlowQuery}
            rowsTruncated={rowsTruncated}
            state={panelState}
            onRetry={refetch}
        >
            <Suspense fallback={<EmptyState message={"Loading panel..."}/>}>
                <PanelComponent
                    annotations={annotations}
                    data={displayData}
                    fieldConfig={panel.fieldConfig}
                    height={height}
                    id={panel.id}
                    options={{...plugin.defaultOptions?.(), ...panel.options}}
                    replaceVariables={replaceVariables}
                    syncId={dashboardUid}
                    timeRange={{from: from, to: to, raw: timeRange}}
                    transparent={panel.transparent ?? false}
                    width={width}
                    onTimeRangeChange={handleTimeRangeChange}
                    onOptionsChange={() => {
                    }}/>
            </Suspense>
        </PanelChrome>
    );
};
