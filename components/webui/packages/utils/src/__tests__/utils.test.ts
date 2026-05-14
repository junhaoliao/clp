import {
    describe,
    expect,
    it,
} from "vitest";

import {cn} from "../cn.js";


describe("@webui/utils", () => {
    it("should merge class names", () => {
        expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should merge conflicting tailwind classes", () => {
        expect(cn("px-2", "px-4")).toBe("px-4");
    });

    it("should handle conditional classes", () => {
        const visible = "visible";
        const extra = "";
        expect(cn("base", visible, extra, "end"))
            .toBe("base visible end");
    });

    it("should handle null values", () => {
        expect(cn("base", null, null)).toBe("base");
    });
});
