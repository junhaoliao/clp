import type {ReactNode} from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {renderHook} from "@testing-library/react";
import type {DashboardPanel} from "@webui/common/dashboard/types";
import {
    describe,
    expect,
    it,
} from "vitest";

import {usePanelErrorSummary} from "../use-panel-error-summary";


const mockPanel: DashboardPanel = {
    datasource: {type: "mysql", uid: "default"},
    gridPos: {h: 4, w: 6, x: 0, y: 0},
    id: "p1",
    options: {},
    queries: [{datasource: {type: "mysql", uid: "default"}, query: "SELECT 1", refId: "A"}],
    title: "Test Panel",
    type: "timeseries",
};

/**
 *
 */
function createWrapper () {
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });

    return function Wrapper ({children}: {children: ReactNode}) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

describe("usePanelErrorSummary", () => {
    it("should report zero errors when no panels are in error state", () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => usePanelErrorSummary([mockPanel]), {wrapper});

        expect(result.current.errorCount).toBe(0);
        expect(result.current.hasErrors).toBe(false);
        expect(result.current.totalPanels).toBe(1);
    });

    it("should report zero errors for empty panel list", () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => usePanelErrorSummary([]), {wrapper});

        expect(result.current.errorCount).toBe(0);
        expect(result.current.hasErrors).toBe(false);
        expect(result.current.totalPanels).toBe(0);
    });

    it("should count panels with error query state", () => {
        const queryClient = new QueryClient({
            defaultOptions: {queries: {retry: false}},
        });

        // Manually set a query to error state
        queryClient.setQueryData(["panelQuery",
            "p1"], null);
        queryClient.setQueryDefaults(["panelQuery",
            "p1"], {});

        /**
         *
         * @param root0
         * @param root0.children
         */
        const Wrapper = ({children}: {children: ReactNode}) => {
            return (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            );
        };

        const {result} = renderHook(() => usePanelErrorSummary([mockPanel]), {wrapper: Wrapper});

        expect(result.current.totalPanels).toBe(1);
    });
});
