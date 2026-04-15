import {
    describe,
    expect,
    test,
} from "vitest";

import {sqlSchema} from "./os.js";


describe("sqlSchema", () => {
    test("accepts valid SQL query", () => {
        expect(sqlSchema.parse({queryString: "SELECT * FROM table"})).toEqual({
            queryString: "SELECT * FROM table",
        });
    });

    test("rejects empty queryString", () => {
        expect(() => sqlSchema.parse({queryString: ""})).toThrow();
    });

    test("rejects missing queryString", () => {
        expect(() => sqlSchema.parse({})).toThrow();
    });
});
