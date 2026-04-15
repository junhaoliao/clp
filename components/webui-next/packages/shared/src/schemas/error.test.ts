import {
    describe,
    expect,
    test,
} from "vitest";

import {errorSchema} from "./error.js";


describe("errorSchema", () => {
    test("accepts valid error", () => {
        expect(errorSchema.parse({message: "Something went wrong"})).toEqual({
            message: "Something went wrong",
        });
    });

    test("accepts empty message", () => {
        expect(errorSchema.parse({message: ""}).message).toBe("");
    });

    test("rejects missing message", () => {
        expect(() => errorSchema.parse({})).toThrow();
    });

    test("rejects non-string message", () => {
        expect(() => errorSchema.parse({message: 123})).toThrow();
    });
});
