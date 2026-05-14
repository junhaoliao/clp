import {
    describe,
    expect,
    it,
} from "vitest";

import {
    interpolateVariables,
    resolveVariables,
} from "../variable-interpolation";


describe("interpolateVariables", () => {
    it("should replace $variable_name tokens", () => {
        expect(interpolateVariables("SELECT * FROM $table", {table: "logs"})).toBe("SELECT * FROM logs");
    });

    it("should replace ${variable_name} tokens", () => {
        expect(interpolateVariables("host = ${host}", {host: "server1"})).toBe("host = server1");
    });

    it("should replace multiple variables", () => {
        expect(interpolateVariables("$db.$table", {db: "clp", table: "archives"})).toBe("clp.archives");
    });

    it("should leave unknown variables as-is", () => {
        expect(interpolateVariables("$unknown", {})).toBe("$unknown");
    });

    it("should handle array values (join with comma)", () => {
        expect(interpolateVariables("WHERE host IN ($hosts)", {hosts: ["a",
            "b",
            "c"]}))
            .toBe("WHERE host IN (a,b,c)");
    });

    it("should handle number values", () => {
        expect(interpolateVariables("LIMIT $limit", {limit: 100})).toBe("LIMIT 100");
    });

    it("should handle empty string", () => {
        expect(interpolateVariables("", {foo: "bar"})).toBe("");
    });

    it("should handle string with no variables", () => {
        expect(interpolateVariables("SELECT 1", {foo: "bar"})).toBe("SELECT 1");
    });
});

describe("resolveVariables", () => {
    it("should include built-in variables", () => {
        const resolved = resolveVariables({});
        expect(resolved).toHaveProperty("__interval");
        expect(resolved).toHaveProperty("__dashboard");
    });

    it("should include time range variables as epoch ms", () => {
        const resolved = resolveVariables({}, {from: "now-6h", to: "now"});
        const fromMs = Number(resolved["__from"]);
        const toMs = Number(resolved["__to"]);
        expect(fromMs).toBeGreaterThan(0);
        expect(toMs).toBeGreaterThan(0);
        expect(toMs - fromMs).toBeGreaterThan(0);
    });

    it("should merge custom variables with built-ins", () => {
        const resolved = resolveVariables({dataset: "prod"}, {from: "now-1h", to: "now"});
        expect(resolved["dataset"]).toBe("prod");
        expect(Number(resolved["__from"])).toBeGreaterThan(0);
    });

    it("should use panelWidthPx for $__interval calculation", () => {
        const narrow = resolveVariables({}, {from: "now-6h", to: "now"}, "", 300);
        const wide = resolveVariables({}, {from: "now-6h", to: "now"}, "", 2000);

        // Narrow panel should produce a coarser interval (fewer data points)
        expect(narrow["__interval"]).not.toBe(wide["__interval"]);
    });
});
