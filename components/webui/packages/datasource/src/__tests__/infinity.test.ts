import {
    describe,
    expect,
    it,
} from "vitest";

import {
    parseCsvResponse,
    parseJsonResponse,
} from "../infinity/index.js";


describe("Infinity JSON Parser", () => {
    it("should parse a flat JSON array", () => {
        const data = [
            {name: "Alice", age: 30},
            {name: "Bob", age: 25},
        ];
        const frames = parseJsonResponse(data);
        expect(frames).toHaveLength(1);
        expect(frames[0]!.length).toBe(2);
        expect(frames[0]!.fields[0]!.name).toBe("name");
        expect(frames[0]!.fields[1]!.name).toBe("age");
    });

    it("should apply root selector", () => {
        const data = {
            results: [
                {id: 1, title: "A"},
                {id: 2, title: "B"},
            ],
        };
        const frames = parseJsonResponse(data, "results");
        expect(frames[0]!.length).toBe(2);
        expect(frames[0]!.fields[0]!.name).toBe("id");
    });

    it("should use column definitions when provided", () => {
        const data = [
            {hostname: "srv1", cpu: 80},
            {hostname: "srv2", cpu: 45},
        ];
        const frames = parseJsonResponse(data, undefined, [
            {selector: "hostname", text: "Host", type: "string"},
            {selector: "cpu", text: "CPU %", type: "number"},
        ]);

        expect(frames[0]!.fields[0]!.name).toBe("Host");
        expect(frames[0]!.fields[1]!.name).toBe("CPU %");
        expect(frames[0]!.fields[1]!.values).toEqual([80,
            45]);
    });

    it("should handle empty data", () => {
        const frames = parseJsonResponse([]);
        expect(frames[0]!.length).toBe(0);
    });

    it("should handle non-object data as raw values", () => {
        const frames = parseJsonResponse(["hello",
            "world"]);

        expect(frames[0]!.length).toBe(2);
    });

    it("should handle nested root selectors", () => {
        const data = {response: {data: [{x: 1},
            {x: 2}]}};
        const frames = parseJsonResponse(data, "response.data");
        expect(frames[0]!.length).toBe(2);
    });
});

describe("Infinity CSV Parser", () => {
    it("should parse simple CSV", () => {
        const csv = "name,age\nAlice,30\nBob,25";
        const frames = parseCsvResponse(csv);
        expect(frames[0]!.length).toBe(2);
        expect(frames[0]!.fields[0]!.name).toBe("name");
        expect(frames[0]!.fields[1]!.name).toBe("age");
    });

    it("should handle CSV with column definitions", () => {
        const csv = "hostname,cpu\nsrv1,80\nsrv2,45";
        const frames = parseCsvResponse(csv, [
            {selector: "hostname", text: "Host", type: "string"},
            {selector: "cpu", text: "CPU %", type: "number"},
        ]);

        expect(frames[0]!.fields[0]!.name).toBe("Host");
        expect(frames[0]!.fields[1]!.name).toBe("CPU %");
        expect(frames[0]!.fields[1]!.values).toEqual([80,
            45]);
    });

    it("should handle quoted CSV fields", () => {
        const csv = 'name,desc\n"Alice, Jr.","Hello world"\n"Bob","Test"';
        const frames = parseCsvResponse(csv);
        expect(frames[0]!.length).toBe(2);
        expect(frames[0]!.fields[0]!.values[0]).toBe("Alice, Jr.");
    });

    it("should handle empty CSV", () => {
        const frames = parseCsvResponse("");
        expect(frames[0]!.length).toBe(0);
    });

    it("should handle header-only CSV", () => {
        const frames = parseCsvResponse("name,age");
        expect(frames[0]!.length).toBe(0);
    });
});
