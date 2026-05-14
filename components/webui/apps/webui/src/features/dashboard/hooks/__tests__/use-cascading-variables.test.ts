import type {DashboardVariable} from "@webui/common/dashboard/types";
import {
    describe,
    expect,
    it,
} from "vitest";

import {resolveVariableOrder} from "../use-cascading-variables";


describe("resolveVariableOrder", () => {
    it("should return variables in declaration order when no dependencies", () => {
        const vars: DashboardVariable[] = [
            {id: "1", name: "host", type: "custom"},
            {id: "2", name: "app", type: "custom"},
        ];
        const result = resolveVariableOrder(vars);
        expect(result.map((v) => v.name)).toEqual(["host",
            "app"]);
    });

    it("should put parent before child", () => {
        const vars: DashboardVariable[] = [
            {id: "1", name: "table", type: "query", dependsOn: ["database"]},
            {id: "2", name: "database", type: "query"},
        ];
        const result = resolveVariableOrder(vars);
        expect(result.map((v) => v.name)).toEqual(["database",
            "table"]);
    });

    it("should handle multi-level dependency chains", () => {
        const vars: DashboardVariable[] = [
            {id: "1", name: "column", type: "query", dependsOn: ["table"]},
            {id: "2", name: "table", type: "query", dependsOn: ["database"]},
            {id: "3", name: "database", type: "query"},
        ];
        const result = resolveVariableOrder(vars);
        expect(result.map((v) => v.name)).toEqual(["database",
            "table",
            "column"]);
    });

    it("should handle independent variables with a shared dependency", () => {
        const vars: DashboardVariable[] = [
            {id: "1", name: "tableA", type: "query", dependsOn: ["database"]},
            {id: "2", name: "tableB", type: "query", dependsOn: ["database"]},
            {id: "3", name: "database", type: "query"},
        ];
        const result = resolveVariableOrder(vars);
        expect(result[0]!.name).toBe("database");
        expect(result).toHaveLength(3);
    });

    it("should handle empty variables list", () => {
        expect(resolveVariableOrder([])).toEqual([]);
    });
});
