import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {initializePanelPlugins} from "../init";
import {
    getAllPanelPlugins,
    getPanelPlugin,
} from "../registry";


describe("Panel plugin initialization", () => {
    beforeEach(() => {
    // Re-initialize for each test
    });

    it("should register all 9 built-in panel plugins", () => {
        initializePanelPlugins();
        const plugins = getAllPanelPlugins();
        expect(plugins.length).toBeGreaterThanOrEqual(9);
    });

    it("should register timeseries plugin", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("timeseries");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Time Series");
        expect(plugin!.component).toBeDefined();
    });

    it("should register stat plugin", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("stat");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Stat");
    });

    it("should register table plugin", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("table");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Table");
    });

    it("should register barchart plugin", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("barchart");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Bar Chart");
    });

    it("should register logs plugin", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("logs");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Logs");
    });

    it("should register markdown plugin", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("markdown");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Markdown");
        expect(plugin!.meta.requiresQuery).toBe(false);
    });

    it("should register gauge plugin", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("gauge");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Gauge");
    });

    it("should register heatmap plugin", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("heatmap");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Heatmap");
    });

    it("should register piechart plugin", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("piechart");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Pie Chart");
    });

    it("should register row plugin with requiresQuery=false", () => {
        initializePanelPlugins();
        const plugin = getPanelPlugin("row");
        expect(plugin).toBeDefined();
        expect(plugin!.meta.name).toBe("Row");
        expect(plugin!.meta.requiresQuery).toBe(false);
    });

    it("each plugin should have a component", () => {
        initializePanelPlugins();
        const plugins = getAllPanelPlugins();
        for (const plugin of plugins) {
            expect(plugin.component, `Plugin ${plugin.meta.type} missing component`).toBeDefined();
        }
    });

    it("each plugin should have default options", () => {
        initializePanelPlugins();
        const plugins = getAllPanelPlugins();
        for (const plugin of plugins) {
            const opts = plugin.defaultOptions?.();
            expect(opts, `Plugin ${plugin.meta.type} missing defaultOptions`).toBeDefined();
        }
    });
});
