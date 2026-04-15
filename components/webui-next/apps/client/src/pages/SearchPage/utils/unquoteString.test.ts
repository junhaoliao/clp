import {describe, expect, test} from "vitest";

import {unquoteString} from "./unquoteString";


describe("unquoteString", () => {
    test("returns empty string unchanged", () => {
        expect(unquoteString("")).toBe("");
    });

    test("returns unquoted string unchanged", () => {
        expect(unquoteString("hello")).toBe("hello");
    });

    test("removes wrapping double quotes", () => {
        expect(unquoteString("\"hello\"")).toBe("hello");
    });

    test("unescapes escaped quotes inside quoted string", () => {
        expect(unquoteString("\"say \\\"hi\\\"\"")).toBe("say \"hi\"");
    });

    test("does not unescape non-quote characters", () => {
        expect(unquoteString("\"path\\\\file\"")).toBe("path\\\\file");
    });

    test("throws if unescaped quote is in the middle", () => {
        expect(() => unquoteString("a\"b")).toThrow(
            "Found unescaped quote character",
        );
    });

    test("throws if only begin quote exists", () => {
        expect(() => unquoteString("\"hello")).toThrow(
            "Begin/end quote is missing.",
        );
    });

    test("throws if only end quote exists", () => {
        expect(() => unquoteString("hello\"")).toThrow(
            "Begin/end quote is missing.",
        );
    });

    test("handles single-character quoted string", () => {
        expect(unquoteString("\"a\"")).toBe("a");
    });

    test("handles empty quoted string", () => {
        expect(unquoteString("\"\"")).toBe("");
    });
});
