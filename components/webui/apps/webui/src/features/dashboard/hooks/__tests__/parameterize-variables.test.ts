import {
    describe,
    expect,
    it,
} from "vitest";
import {
    interpolateVariables,
    parameterizeVariables,
} from "../variable-interpolation";

describe("parameterizeVariables", () => {
    it("should replace $var with ? and collect values", () => {
        const result = parameterizeVariables(
            "SELECT * FROM logs WHERE host = $host AND level = $level",
            {host: "web-01", level: "error"},
        );
        expect(result.sql).toBe("SELECT * FROM logs WHERE host = ? AND level = ?");
        expect(result.params).toEqual(["web-01", "error"]);
    });

    it("should replace ${var} with ? and collect values", () => {
        const result = parameterizeVariables(
            "SELECT * FROM logs WHERE host = ${host}",
            {host: "web-01"},
        );
        expect(result.sql).toBe("SELECT * FROM logs WHERE host = ?");
        expect(result.params).toEqual(["web-01"]);
    });

    it("should leave undefined variables as-is", () => {
        const result = parameterizeVariables(
            "SELECT * FROM logs WHERE host = $unknown",
            {},
        );
        expect(result.sql).toBe("SELECT * FROM logs WHERE host = $unknown");
        expect(result.params).toEqual([]);
    });

    it("should handle mixed defined and undefined variables", () => {
        const result = parameterizeVariables(
            "SELECT * FROM $table WHERE host = $host",
            {host: "web-01"},
        );
        expect(result.sql).toBe("SELECT * FROM $table WHERE host = ?");
        expect(result.params).toEqual(["web-01"]);
    });

    it("should convert array values to comma-separated ? placeholders", () => {
        const result = parameterizeVariables(
            "SELECT * FROM logs WHERE host IN ($hosts)",
            {hosts: ["web-01", "web-02"]},
        );
        expect(result.sql).toBe("SELECT * FROM logs WHERE host IN (?, ?)");
        expect(result.params).toEqual(["web-01", "web-02"]);
    });

    it("should handle numeric values", () => {
        const result = parameterizeVariables(
            "SELECT * FROM logs WHERE count > $threshold",
            {threshold: 100},
        );
        expect(result.sql).toBe("SELECT * FROM logs WHERE count > ?");
        expect(result.params).toEqual([100]);
    });

    it("should return empty params for template with no variables", () => {
        const result = parameterizeVariables(
            "SELECT * FROM logs",
            {},
        );
        expect(result.sql).toBe("SELECT * FROM logs");
        expect(result.params).toEqual([]);
    });
});

describe("interpolateVariables (unchanged)", () => {
    it("should still work for non-parameterized use cases", () => {
        const result = interpolateVariables(
            "SELECT * FROM logs WHERE host = $host",
            {host: "web-01"},
        );
        expect(result).toBe("SELECT * FROM logs WHERE host = web-01");
    });
});
