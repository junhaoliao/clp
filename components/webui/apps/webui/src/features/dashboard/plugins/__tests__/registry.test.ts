import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import type {PanelPlugin} from "../registry";
import {
    createOptionsBuilder,
    getAllPanelPlugins,
    getPanelPlugin,
    registerPanelPlugin,
} from "../registry";


describe("Panel Plugin Registry", () => {
    beforeEach(() => {
    // Clear registry by getting all and removing
        const plugins = getAllPanelPlugins();
        for (const _p of plugins) {
            // Registry is a module-level Map, we can't clear it directly
            // so we re-register with empty
        }
    });

    it("should register and retrieve a panel plugin", () => {
        const plugin: PanelPlugin = {
            meta: {
                type: "timeseries",
                name: "Time Series",
                icon: "LineChart",
                description: "Time series chart",
                defaultGridPos: {w: 6, h: 4},
                minGridPos: {w: 2, h: 2},
            },
            component: () => null,
        };

        registerPanelPlugin(plugin);
        expect(getPanelPlugin("timeseries")).toBe(plugin);
    });

    it("should return undefined for unknown panel type", () => {
        expect(getPanelPlugin("unknown" as never)).toBeUndefined();
    });

    it("should list all registered plugins", () => {
        const plugin: PanelPlugin = {
            meta: {
                type: "stat",
                name: "Stat",
                icon: "Hash",
                description: "Single value",
                defaultGridPos: {w: 3, h: 2},
                minGridPos: {w: 2, h: 2},
            },
            component: () => null,
        };

        registerPanelPlugin(plugin);
        const all = getAllPanelPlugins();
        expect(all.length).toBeGreaterThan(0);
        expect(all.some((p) => "stat" === p.meta.type)).toBe(true);
    });
});

describe("PanelOptionsBuilder", () => {
    it("should build options with fluent API", () => {
        const builder = createOptionsBuilder();
        const result = builder
            .addSelect("display", {label: "Display",
                options: ["Actual",
                    "Percent"]})
            .addNumberInput("decimals", {label: "Decimals", min: 0, max: 10, defaultValue: 2})
            .addToggle("sparkline", {label: "Show Sparkline", defaultValue: false})
            .addColorPicker("thresholdColor", {label: "Threshold Color"})
            .build();

        expect(result.get("display")).toBe("Actual");
        expect(result.get("decimals")).toBe(2);
        expect(result.get("sparkline")).toBe(false);
        expect(result.get("thresholdColor")).toBe("#000000");
    });

    it("should use default values when provided", () => {
        const builder = createOptionsBuilder();
        const result = builder
            .addSelect("mode", {label: "Mode",
                options: ["a",
                    "b"],
                defaultValue: "b"})
            .addToggle("enabled", {label: "Enabled", defaultValue: true})
            .build();

        expect(result.get("mode")).toBe("b");
        expect(result.get("enabled")).toBe(true);
    });
});
