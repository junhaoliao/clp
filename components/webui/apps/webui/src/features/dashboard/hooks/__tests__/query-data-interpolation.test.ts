import {describe, it, expect} from "vitest";
import {interpolateQueryData} from "../query-data-interpolation";

const makeFrame = (
  refId: string,
  fields: Array<{name: string; type?: string; values: unknown[]; config?: Record<string, unknown>}>,
) => ({
  name: refId,
  refId,
  fields: fields.map((f) => ({type: "string", ...f})),
  length: fields[0]?.values.length ?? 0,
});

const emptyData: Array<ReturnType<typeof makeFrame>> = [];

const singleFrame = [
  makeFrame("A", [
    {name: "host", values: ["server1", "server2", "server3"]},
    {name: "cpu", type: "number", values: [45.5, 72.1, 10], config: {unit: "%"}},
    {name: "status", values: ["ok", "warn", "ok"]},
  ]),
];

const multiFrame = [
  makeFrame("A", [{name: "count", type: "number", values: [100]}]),
  makeFrame("B", [{name: "host", values: ["alpha", "beta"]}]),
];

describe("interpolateQueryData", () => {
  // ── Value interpolation: ${data.refId.fieldName[index]} ──────────────

  describe("value interpolation", () => {
    it("should replace ${data.A.field[0]} with first value", () => {
      expect(interpolateQueryData("Host: ${data.A.host[0]}", singleFrame)).toBe("Host: server1");
    });

    it("should replace ${data.A.field[last]} with last value", () => {
      expect(interpolateQueryData("Host: ${data.A.host[last]}", singleFrame)).toBe("Host: server3");
    });

    it("should default to index 0 when bracket omitted", () => {
      expect(interpolateQueryData("Host: ${data.A.host}", singleFrame)).toBe("Host: server1");
    });

    it("should format integers without decimals", () => {
      expect(interpolateQueryData("Count: ${data.A.cpu[2]}", singleFrame)).toBe("Count: 10");
    });

    it("should format floats to 2 decimal places", () => {
      expect(interpolateQueryData("CPU: ${data.A.cpu[0]}", singleFrame)).toBe("CPU: 45.50");
    });

    it("should leave pattern as-is for unknown refId", () => {
      expect(interpolateQueryData("${data.Z.field[0]}", singleFrame)).toBe("${data.Z.field[0]}");
    });

    it("should leave pattern as-is for unknown field", () => {
      expect(interpolateQueryData("${data.A.unknown[0]}", singleFrame)).toBe("${data.A.unknown[0]}");
    });

    it("should leave pattern as-is for out-of-bounds index", () => {
      expect(interpolateQueryData("${data.A.host[99]}", singleFrame)).toBe("${data.A.host[99]}");
    });

    it("should resolve from multiple frames by refId", () => {
      expect(interpolateQueryData("A=${data.A.count[0]} B=${data.B.host[1]}", multiFrame)).toBe("A=100 B=beta");
    });

    it("should resolve displayName as field fallback", () => {
      const data = [makeFrame("A", [{name: "value", values: [42], config: {displayName: "metric"}}])];
      expect(interpolateQueryData("${data.A.metric[0]}", data)).toBe("42");
    });
  });

  // ── Table rendering: {{table refId}} ─────────────────────────────────

  describe("table rendering", () => {
    it("should render a markdown table from DataFrame", () => {
      const result = interpolateQueryData("{{table A}}", [
        makeFrame("A", [
          {name: "host", values: ["srv1", "srv2"]},
          {name: "cpu", type: "number", values: [10, 20]},
        ]),
      ]);
      expect(result).toBe(
        "| host | cpu |\n| --- | --- |\n| srv1 | 10 |\n| srv2 | 20 |",
      );
    });

    it("should use displayName in table headers when available", () => {
      const result = interpolateQueryData("{{table A}}", [
        makeFrame("A", [
          {name: "val", values: [1], config: {displayName: "Value"}},
        ]),
      ]);
      expect(result).toContain("| Value |");
    });

    it("should render *No data* for empty frame", () => {
      const result = interpolateQueryData("{{table A}}", [
        makeFrame("A", [{name: "x", values: []}]),
      ]);
      expect(result).toBe("*No data*");
    });

    it("should leave pattern as-is for unknown refId", () => {
      expect(interpolateQueryData("{{table Z}}", singleFrame)).toBe("{{table Z}}");
    });

    it("should format numbers in table cells", () => {
      const result = interpolateQueryData("{{table A}}", [
        makeFrame("A", [
          {name: "val", type: "number", values: [3.14159]},
        ]),
      ]);
      expect(result).toContain("| 3.14 |");
    });
  });

  // ── List rendering: {{list refId fieldName}} ─────────────────────────

  describe("list rendering", () => {
    it("should render field values as bullet list", () => {
      const result = interpolateQueryData("{{list A host}}", singleFrame);
      expect(result).toBe("- server1\n- server2\n- server3");
    });

    it("should render *No data* for empty field", () => {
      const result = interpolateQueryData("{{list A host}}", [
        makeFrame("A", [{name: "host", values: []}]),
      ]);
      expect(result).toBe("*No data*");
    });

    it("should leave pattern as-is for unknown refId", () => {
      expect(interpolateQueryData("{{list Z host}}", singleFrame)).toBe("{{list Z host}}");
    });

    it("should leave pattern as-is for unknown field", () => {
      expect(interpolateQueryData("{{list A missing}}", singleFrame)).toBe("{{list A missing}}");
    });

    it("should format numbers in list items", () => {
      const result = interpolateQueryData("{{list A cpu}}", singleFrame);
      expect(result).toBe("- 45.50\n- 72.10\n- 10");
    });
  });

  // ── Stat rendering: {{stat refId fieldName}} ─────────────────────────

  describe("stat rendering", () => {
    it("should render last value as heading with unit", () => {
      const result = interpolateQueryData("{{stat A cpu}}", singleFrame);
      expect(result).toBe("# 10 %");
    });

    it("should render without unit when config has no unit", () => {
      const result = interpolateQueryData("{{stat A host}}", singleFrame);
      expect(result).toBe("# server3");
    });

    it("should leave pattern as-is for unknown refId", () => {
      expect(interpolateQueryData("{{stat Z cpu}}", singleFrame)).toBe("{{stat Z cpu}}");
    });

    it("should leave pattern as-is for unknown field", () => {
      expect(interpolateQueryData("{{stat A missing}}", singleFrame)).toBe("{{stat A missing}}");
    });

    it("should leave pattern as-is for empty field values", () => {
      const result = interpolateQueryData("{{stat A cpu}}", [
        makeFrame("A", [{name: "cpu", type: "number", values: []}]),
      ]);
      expect(result).toBe("{{stat A cpu}}");
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should return content unchanged with empty data", () => {
      const content = "# Hello\n\nNo patterns here.";
      expect(interpolateQueryData(content, emptyData)).toBe(content);
    });

    it("should handle multiple patterns in one content", () => {
      const result = interpolateQueryData(
        "Top host: ${data.A.host[last]}\n\n{{table A}}",
        singleFrame,
      );
      expect(result).toContain("server3");
      expect(result).toContain("| host |");
    });

    it("should handle null and undefined values gracefully", () => {
      const data = [makeFrame("A", [{name: "val", values: [null, undefined, "ok"]}])];
      expect(interpolateQueryData("${data.A.val[0]}", data)).toBe("");
      expect(interpolateQueryData("${data.A.val[1]}", data)).toBe("");
      expect(interpolateQueryData("${data.A.val[2]}", data)).toBe("ok");
    });

    it("should handle mixed patterns that don't match", () => {
      expect(interpolateQueryData("Price: $50 and ${data.A.host[0]}", singleFrame)).toBe(
        "Price: $50 and server1",
      );
    });

    it("should not confuse {{table}} with ${data}", () => {
      const result = interpolateQueryData("${data.A.cpu[0]}\n{{table A}}", singleFrame);
      expect(result).toMatch(/^45\.50\n\| host/);
    });
  });
});
