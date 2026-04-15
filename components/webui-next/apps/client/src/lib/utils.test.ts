import {
    describe,
    expect,
    test,
} from "vitest";

import {cn} from "./utils";


describe("cn", () => {
    test("merges class names", () => {
        expect(cn("foo", "bar")).toBe("foo bar");
    });

    test("handles conditional classes", () => {
        expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    });

    test("handles undefined and null values", () => {
        expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    test("merges tailwind classes correctly (deduplicates conflicting classes)", () => {
        expect(cn("px-2", "px-4")).toBe("px-4");
    });

    test("merges responsive tailwind classes", () => {
        expect(cn("md:px-2", "md:px-4")).toBe("md:px-4");
    });

    test("handles empty input", () => {
        expect(cn()).toBe("");
    });

    test("handles array of classes", () => {
        expect(cn(["foo",
            "bar"], "baz")).toBe("foo bar baz");
    });
});
