import {
    describe,
    expect,
    it,
} from "vitest";

import {
    analyzeSharedNodes,
    countVariables,
} from "../shared-node-analysis";


describe("countVariables", () => {
    it("should return 0 for template with no variables", () => {
        expect(countVariables("no variables here")).toBe(0);
    });

    it("should count %VAR% occurrences", () => {
        expect(countVariables("start %VAR% middle %VAR% end")).toBe(2);
    });

    it("should return 0 for empty string", () => {
        expect(countVariables("")).toBe(0);
    });

    it("should count single variable", () => {
        expect(countVariables("%VAR%")).toBe(1);
    });
});

describe("analyzeSharedNodes", () => {
    it("should return empty array for no logtypes", () => {
        expect(analyzeSharedNodes([])).toEqual([]);
    });

    it("should return empty array for single logtype with single variable", () => {
        const logtypes = [
            {logtype: "lt1", template: "msg %VAR%", variables: [{index: 0, type: "string"}]},
        ];

        expect(analyzeSharedNodes(logtypes)).toEqual([]);
    });

    it("should detect shared node with inconsistent types", () => {
        const logtypes = [
            {logtype: "lt1", template: "%VAR%", variables: [{index: 0, type: "string"}]},
            {logtype: "lt2", template: "%VAR%", variables: [{index: 0, type: "int"}]},
        ];
        const warnings = analyzeSharedNodes(logtypes);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.variableIndex).toBe(0);
        expect(warnings[0]?.logtypes).toContain("lt1");
        expect(warnings[0]?.logtypes).toContain("lt2");
    });

    it("should not warn when same variable index has consistent types", () => {
        const logtypes = [
            {logtype: "lt1", template: "%VAR%", variables: [{index: 0, type: "string"}]},
            {logtype: "lt2", template: "%VAR%", variables: [{index: 0, type: "string"}]},
        ];

        expect(analyzeSharedNodes(logtypes)).toEqual([]);
    });

    it("should detect multiple shared nodes", () => {
        const logtypes = [
            {
                logtype: "lt1",
                template: "%VAR% %VAR%",
                variables: [{index: 0, type: "string"},
                    {index: 1, type: "int"}],
            },
            {
                logtype: "lt2",
                template: "%VAR% %VAR%",
                variables: [{index: 0, type: "int"},
                    {index: 1, type: "float"}],
            },
        ];
        const warnings = analyzeSharedNodes(logtypes);
        expect(warnings).toHaveLength(2);
    });
});
