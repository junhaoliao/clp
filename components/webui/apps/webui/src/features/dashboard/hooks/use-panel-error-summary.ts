import {useMemo} from "react";

import {useQueryClient} from "@tanstack/react-query";
import type {DashboardPanel} from "@webui/common/dashboard/types";
import type {DataQueryResponse} from "@webui/datasource/types";


interface PanelErrorSummary {
    errorCount: number;
    totalPanels: number;
    hasErrors: boolean;
}

/**
 *
 * @param panels
 */
export function usePanelErrorSummary (panels: DashboardPanel[]): PanelErrorSummary {
    const queryClient = useQueryClient();

    return useMemo(() => {
        let errorCount = 0;

        for (const panel of panels) {
            const queryData = queryClient.getQueryData<DataQueryResponse>(["panelQuery",
                panel.id]);
            const queryState = queryClient.getQueryState(["panelQuery",
                panel.id]);

            if ("error" === queryState?.status) {
                errorCount++;
            } else if (queryData?.errors && 0 < queryData.errors.length) {
                errorCount++;
            }
        }

        return {
            errorCount: errorCount,
            hasErrors: 0 < errorCount,
            totalPanels: panels.length,
        };
    }, [panels,
        queryClient]);
}
