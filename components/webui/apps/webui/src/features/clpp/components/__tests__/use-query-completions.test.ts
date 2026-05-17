import {
    describe,
    expect,
    it,
} from "vitest";

import {
    buildCompletionItems,
    parseQueryContext,
} from "../use-query-completions";


const FIELD_NAMES = ["logLevel", "fetcherID", "javaFQCN", "attempt_id"];
const FIELD_VALUES: string[] = [];

describe("parseQueryContext", () => {
    it("returns field-list for empty input", () => {
        expect(parseQueryContext("")).toEqual({type: "field-list"});
    });

    it("returns field-values when input ends with colon", () => {
        expect(parseQueryContext("logLevel:")).toEqual({
            field: "logLevel",
            type: "field-values",
        });
    });

    it("returns connectors after complete clause with trailing space", () => {
        expect(parseQueryContext("logLevel: INFO ")).toEqual({
            type: "connectors",
        });
    });

    it("returns field-list after 'not ' with trailing space", () => {
        expect(parseQueryContext("not ")).toEqual({type: "field-list"});
    });

    it("returns field-list after 'and ' trailing space", () => {
        expect(parseQueryContext("logLevel: INFO and ")).toEqual({
            type: "field-list",
        });
    });

    it("returns field-list after 'or ' trailing space", () => {
        expect(parseQueryContext("logLevel: INFO or ")).toEqual({
            type: "field-list",
        });
    });

    it("returns field-list after 'not ' following clause", () => {
        expect(parseQueryContext("logLevel: INFO not ")).toEqual({
            type: "field-list",
        });
    });

    it("returns field-prefix for partial field name", () => {
        expect(parseQueryContext("logLe")).toEqual({
            prefix: "logLe",
            type: "field-prefix",
        });
    });

    it("returns field-prefix for 'not' without trailing space", () => {
        expect(parseQueryContext("not")).toEqual({
            prefix: "not",
            type: "field-prefix",
        });
    });

    it("returns none for unrecognized state", () => {
        expect(parseQueryContext("logLevel:INFO")).toEqual({
            type: "none",
        });
    });
});

describe("buildCompletionItems", () => {
    it("includes 'not' operator in field-list", () => {
        const items = buildCompletionItems(
            {type: "field-list"},
            FIELD_NAMES,
            FIELD_VALUES,
        );
        const notItem = items.find((i) => "not" === i.label);
        expect(notItem).toEqual({
            description: "negate next clause",
            label: "not",
            type: "operator",
        });
    });

    it("includes 'not' alongside 'and' and 'or' in connectors", () => {
        const items = buildCompletionItems(
            {type: "connectors"},
            FIELD_NAMES,
            FIELD_VALUES,
        );
        const labels = items.map((i) => i.label);
        expect(labels).toContain("and");
        expect(labels).toContain("or");
        expect(labels).toContain("not");
    });

    it("shows 'not' as operator when prefix matches 'no'", () => {
        const items = buildCompletionItems(
            {prefix: "no", type: "field-prefix"},
            FIELD_NAMES,
            FIELD_VALUES,
        );
        const notItem = items.find((i) => "not" === i.label);
        expect(notItem).toBeDefined();
        expect(notItem?.type).toBe("operator");
    });

    it("shows field matches alongside operator matches in field-prefix", () => {
        const items = buildCompletionItems(
            {prefix: "a", type: "field-prefix"},
            FIELD_NAMES,
            FIELD_VALUES,
        );
        const labels = items.map((i) => i.label);
        expect(labels).toContain("and");
        expect(labels).toContain("attempt_id");
    });

    it("shows all fields in field-list context", () => {
        const items = buildCompletionItems(
            {type: "field-list"},
            FIELD_NAMES,
            FIELD_VALUES,
        );
        const fieldItems = items.filter((i) => "field" === i.type);
        expect(fieldItems.map((i) => i.label)).toEqual(FIELD_NAMES);
    });

    it("shows * and field values in field-values context", () => {
        const items = buildCompletionItems(
            {field: "logLevel", type: "field-values"},
            FIELD_NAMES,
            ["INFO", "WARN"],
        );
        const labels = items.map((i) => i.label);
        expect(labels).toContain("*");
        expect(labels).toContain("INFO");
        expect(labels).toContain("WARN");
    });
});
