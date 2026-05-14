import type {Dashboard} from "@webui/common/dashboard/types";
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    exportDashboard,
    importDashboard,
} from "../export-import";


const mockDashboard: Dashboard = {
    id: "d1",
    uid: "test-uid",
    title: "Test Dashboard",
    tags: ["test"],
    variables: [],
    timeRange: {from: "now-6h", to: "now"},
    panels: [{
        id: "p1",
        type: "timeseries",
        title: "CPU",
        gridPos: {x: 0, y: 0, w: 6, h: 4},
        datasource: {type: "mysql", uid: "ds1"},
        queries: [{refId: "A", datasource: {type: "mysql", uid: "ds1"}, query: "SELECT 1"}],
        options: {},
    }],
    version: 1,
    updatedAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
};

describe("exportDashboard", () => {
    it("should export dashboard as JSON", () => {
        const json = exportDashboard(mockDashboard);
        const parsed = JSON.parse(json);
        expect(parsed.title).toBe("Test Dashboard");
        expect(parsed.panels).toHaveLength(1);
        expect(parsed.schemaVersion).toBe(1);
    });
});

describe("importDashboard", () => {
    it("should import valid dashboard JSON", () => {
        const json = exportDashboard(mockDashboard);
        const {dashboard, error} = importDashboard(json);
        expect(error).toBeUndefined();
        expect(dashboard.title).toBe("Test Dashboard");
    });

    it("should reject JSON without title", () => {
        const {error} = importDashboard(JSON.stringify({panels: []}));
        expect(error).toBe("Dashboard must have a title");
    });

    it("should reject invalid JSON", () => {
        const {error} = importDashboard("not json");
        expect(error).toBe("Invalid JSON");
    });

    it("should provide defaults for missing fields", () => {
        const {dashboard} = importDashboard(JSON.stringify({title: "Minimal"}));
        expect(dashboard.title).toBe("Minimal");
        expect(dashboard.tags).toEqual([]);
        expect(dashboard.panels).toEqual([]);
    });
});
