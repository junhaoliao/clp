import {describe, it, expect} from "vitest";
import {parseInterval} from "../use-auto-refresh";

describe("parseInterval", () => {
  it("should parse seconds", () => {
    expect(parseInterval("30s")).toBe(30000);
  });

  it("should parse minutes", () => {
    expect(parseInterval("5m")).toBe(300000);
  });

  it("should return 0 for empty string", () => {
    expect(parseInterval("")).toBe(0);
  });

  it("should return 0 for invalid format", () => {
    expect(parseInterval("1h")).toBe(0);
  });

  it("should return 0 for non-numeric", () => {
    expect(parseInterval("abs")).toBe(0);
  });
});
