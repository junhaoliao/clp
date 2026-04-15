import {
    describe,
    expect,
    test,
} from "vitest";

import {
    fileEntrySchema,
    fileListRequestSchema,
    fileListSchema,
} from "./archive-metadata.js";


describe("fileEntrySchema", () => {
    test("accepts valid file entry", () => {
        const entry = {
            isExpandable: true,
            name: "test.log",
            parentPath: "/var/log",
        };

        expect(fileEntrySchema.parse(entry)).toEqual(entry);
    });

    test("accepts non-expandable entry", () => {
        const entry = {
            isExpandable: false,
            name: "file.txt",
            parentPath: "/home",
        };

        expect(fileEntrySchema.parse(entry)).toEqual(entry);
    });

    test("rejects empty name", () => {
        expect(() => fileEntrySchema.parse({
            isExpandable: true,
            name: "",
            parentPath: "/var",
        })).toThrow();
    });

    test("rejects missing fields", () => {
        expect(() => fileEntrySchema.parse({})).toThrow();
    });
});

describe("fileListRequestSchema", () => {
    test("accepts request with path", () => {
        expect(fileListRequestSchema.parse({path: "/var/log"})).toEqual({path: "/var/log"});
    });

    test("defaults path to /", () => {
        expect(fileListRequestSchema.parse({}).path).toBe("/");
    });

    test("accepts empty object (uses default)", () => {
        const result = fileListRequestSchema.parse({});
        expect(result.path).toBe("/");
    });
});

describe("fileListSchema", () => {
    test("accepts array of file entries", () => {
        const entries = [
            {isExpandable: true, name: "dir", parentPath: "/"},
            {isExpandable: false, name: "file.txt", parentPath: "/"},
        ];

        expect(fileListSchema.parse(entries)).toEqual(entries);
    });

    test("accepts empty array", () => {
        expect(fileListSchema.parse([])).toEqual([]);
    });
});
