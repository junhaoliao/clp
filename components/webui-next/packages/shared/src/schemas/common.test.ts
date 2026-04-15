import {
    describe,
    expect,
    test,
} from "vitest";

import {
    idSchema,
    stringSchema,
} from "./common.js";


describe("stringSchema", () => {
    test("accepts non-empty strings", () => {
        expect(stringSchema.parse("hello")).toBe("hello");
        expect(stringSchema.parse("a")).toBe("a");
    });

    test("rejects empty strings", () => {
        expect(() => stringSchema.parse("")).toThrow();
    });

    test("rejects non-strings", () => {
        expect(() => stringSchema.parse(123)).toThrow();
        expect(() => stringSchema.parse(null)).toThrow();
    });
});

describe("idSchema", () => {
    test("accepts positive integers", () => {
        expect(idSchema.parse(1)).toBe(1);
        expect(idSchema.parse(42)).toBe(42);
        expect(idSchema.parse(999999)).toBe(999999);
    });

    test("rejects zero", () => {
        expect(() => idSchema.parse(0)).toThrow();
    });

    test("rejects negative integers", () => {
        expect(() => idSchema.parse(-1)).toThrow();
    });

    test("rejects non-integers", () => {
        expect(() => idSchema.parse(1.5)).toThrow();
        expect(() => idSchema.parse("1")).toThrow();
    });
});
