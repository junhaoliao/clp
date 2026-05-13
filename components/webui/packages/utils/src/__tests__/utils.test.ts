import {describe, it, expect} from "vitest";
import {cn} from "../cn.js";

describe("@webui/utils", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should merge conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("should handle undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });
});
