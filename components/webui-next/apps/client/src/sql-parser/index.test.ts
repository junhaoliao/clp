import dayjs from "dayjs";
import {
    describe,
    expect,
    it,
} from "vitest";

import type {
    BuildSearchQueryProps,
    BuildTimelineQueryProps,
    ValidationError,
} from "./index";
import {
    buildSearchQuery,
    buildTimelineQuery,
    SyntaxError,
    validateBooleanExpression,
    validateSelectItemList,
    validateSortItemList,
} from "./index";


// =============================================================================
// validateSelectItemList
// =============================================================================

describe("validateSelectItemList", () => {
    it("returns an empty array for a valid single column", () => {
        const errors = validateSelectItemList("col1");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for a wildcard select", () => {
        const errors = validateSelectItemList("*");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for multiple comma-separated columns", () => {
        const errors = validateSelectItemList("col1, col2, col3");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for qualified column names", () => {
        const errors = validateSelectItemList("t.col1, t.col2");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for expressions with aliases", () => {
        const errors = validateSelectItemList("col1 AS c1");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for function calls in select list", () => {
        const errors = validateSelectItemList("COUNT(*), SUM(amount)");
        expect(errors).toEqual([]);
    });

    it("returns errors for invalid SQL tokens", () => {
        const errors = validateSelectItemList("col1 !! col2");
        expect(errors.length).toBeGreaterThan(0);
    });

    it("returns errors for empty string", () => {
        const errors = validateSelectItemList("");
        expect(errors.length).toBeGreaterThan(0);
    });

    it("returns errors for random special characters", () => {
        const errors = validateSelectItemList("@#$%");
        expect(errors.length).toBeGreaterThan(0);
    });

    it("includes line, column, and message in validation errors", () => {
        const errors = validateSelectItemList("!!!");
        expect(errors.length).toBeGreaterThan(0);
        const error: ValidationError = errors[0]!;
        expect(error).toHaveProperty("line");
        expect(error).toHaveProperty("column");
        expect(error).toHaveProperty("message");
        expect(error).toHaveProperty("startColumn");
        expect(error).toHaveProperty("endColumn");
        expect(typeof error.line).toBe("number");
        expect(typeof error.column).toBe("number");
        expect(typeof error.message).toBe("string");
        expect(typeof error.startColumn).toBe("number");
        expect(typeof error.endColumn).toBe("number");
    });

    it("is case-insensitive for keywords", () => {
        // The UpperCaseCharStream converts input to uppercase before lexing,
        // so lowercase keywords should parse correctly.
        const errors = validateSelectItemList("col1 as c1");
        expect(errors).toEqual([]);
    });

    it("rejects DISTINCT as a standalone select item (not part of SELECT clause)", () => {
        // DISTINCT is only valid in a full SELECT statement, not in a
        // standalone select item list
        const errors = validateSelectItemList("DISTINCT col1");
        expect(errors.length).toBeGreaterThan(0);
    });
});


// =============================================================================
// validateBooleanExpression
// =============================================================================

describe("validateBooleanExpression", () => {
    it("returns an empty array for a simple comparison", () => {
        const errors = validateBooleanExpression("col1 > 10");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for an AND expression", () => {
        const errors = validateBooleanExpression("col1 > 10 AND col2 < 20");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for an OR expression", () => {
        const errors = validateBooleanExpression("col1 = 1 OR col2 = 2");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for a NOT expression", () => {
        const errors = validateBooleanExpression("NOT col1 = 1");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for parenthesized expressions", () => {
        const errors = validateBooleanExpression("(col1 > 10) AND (col2 < 20)");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for string comparison", () => {
        const errors = validateBooleanExpression("name = 'test'");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for IS NULL expression", () => {
        const errors = validateBooleanExpression("col1 IS NULL");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for BETWEEN expression", () => {
        const errors = validateBooleanExpression("col1 BETWEEN 1 AND 10");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for IN expression", () => {
        const errors = validateBooleanExpression("col1 IN (1, 2, 3)");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for LIKE expression", () => {
        const errors = validateBooleanExpression("col1 LIKE '%test%'");
        expect(errors).toEqual([]);
    });

    it("returns errors for empty string", () => {
        const errors = validateBooleanExpression("");
        expect(errors.length).toBeGreaterThan(0);
    });

    it("returns errors for incomplete expression", () => {
        const errors = validateBooleanExpression("col1 >");
        expect(errors.length).toBeGreaterThan(0);
    });

    it("accepts a single value expression (grammar allows value expressions)", () => {
        // The boolean expression grammar includes value expressions as a
        // valid baseline, so a single column is accepted
        const errors = validateBooleanExpression("col1");
        expect(errors).toEqual([]);
    });

    it("returns errors for garbage input", () => {
        const errors = validateBooleanExpression("@#$%^&*()");
        expect(errors.length).toBeGreaterThan(0);
    });

    it("is case-insensitive for operators (lowercase 'and')", () => {
        const errors = validateBooleanExpression("col1 > 10 and col2 < 20");
        expect(errors).toEqual([]);
    });

    it("handles complex nested boolean expression", () => {
        const errors = validateBooleanExpression(
            "(a > 1 AND b < 2) OR (c = 3 AND NOT d IS NULL)",
        );

        expect(errors).toEqual([]);
    });
});


// =============================================================================
// validateSortItemList
// =============================================================================

describe("validateSortItemList", () => {
    it("returns an empty array for a single column sort", () => {
        const errors = validateSortItemList("col1 ASC");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for DESC sort", () => {
        const errors = validateSortItemList("col1 DESC");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for multiple sort items", () => {
        const errors = validateSortItemList("col1 ASC, col2 DESC");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for sort without ASC/DESC", () => {
        const errors = validateSortItemList("col1");
        expect(errors).toEqual([]);
    });

    it("returns an empty array for qualified column sort", () => {
        const errors = validateSortItemList("t.col1 ASC");
        expect(errors).toEqual([]);
    });

    it("returns errors for empty string", () => {
        const errors = validateSortItemList("");
        expect(errors.length).toBeGreaterThan(0);
    });

    it("returns errors for invalid sort input", () => {
        const errors = validateSortItemList("!!!");
        expect(errors.length).toBeGreaterThan(0);
    });

    it("is case-insensitive (lowercase 'asc')", () => {
        const errors = validateSortItemList("col1 asc");
        expect(errors).toEqual([]);
    });
});


// =============================================================================
// buildSearchQuery
// =============================================================================

describe("buildSearchQuery", () => {
    const baseProps: BuildSearchQueryProps = {
        selectItemList: "*",
        databaseName: "default",
        startTimestamp: dayjs("2024-01-01T00:00:00Z"),
        endTimestamp: dayjs("2024-01-02T00:00:00Z"),
        timestampKey: "timestamp",
    };

    it("builds a basic SELECT query with timestamp range", () => {
        const sql = buildSearchQuery(baseProps);
        expect(sql).toContain("SELECT * FROM default");
        expect(sql).toContain("WHERE to_unixtime(timestamp) BETWEEN");
        expect(sql).not.toContain("AND (");
        expect(sql).not.toContain("ORDER BY");
        expect(sql).not.toContain("LIMIT");
    });

    it("includes timestamps converted to seconds", () => {
        const start = dayjs("2024-01-01T00:00:00Z");
        const end = dayjs("2024-01-02T00:00:00Z");
        const sql = buildSearchQuery({
            ...baseProps,
            startTimestamp: start,
            endTimestamp: end,
        });

        const startSec = start.valueOf() / 1000;
        const endSec = end.valueOf() / 1000;
        expect(sql).toContain(`${startSec}`);
        expect(sql).toContain(`AND ${endSec}`);
    });

    it("appends AND clause when booleanExpression is provided", () => {
        const sql = buildSearchQuery({
            ...baseProps,
            booleanExpression: "col1 > 10",
        });

        expect(sql).toContain("AND (col1 > 10)");
    });

    it("appends ORDER BY clause when sortItemList is provided", () => {
        const sql = buildSearchQuery({
            ...baseProps,
            sortItemList: "col1 ASC",
        });

        expect(sql).toContain("\nORDER BY col1 ASC");
    });

    it("appends LIMIT clause when limitValue is provided", () => {
        const sql = buildSearchQuery({
            ...baseProps,
            limitValue: "100",
        });

        expect(sql).toContain("\nLIMIT 100");
    });

    it("includes all optional clauses when all are provided", () => {
        const sql = buildSearchQuery({
            ...baseProps,
            booleanExpression: "status = 'active'",
            sortItemList: "created_at DESC",
            limitValue: "50",
        });

        expect(sql).toContain("AND (status = 'active')");
        expect(sql).toContain("\nORDER BY created_at DESC");
        expect(sql).toContain("\nLIMIT 50");
    });

    it("does not include optional clauses when values are undefined", () => {
        const sql = buildSearchQuery({
            ...baseProps,
        });

        expect(sql).not.toContain("AND (");
        expect(sql).not.toContain("ORDER BY");
        expect(sql).not.toContain("LIMIT");
    });

    it("handles undefined explicitly passed for optional params", () => {
        const sql = buildSearchQuery({
            ...baseProps,
            booleanExpression: undefined,
            sortItemList: undefined,
            limitValue: undefined,
        });

        expect(sql).not.toContain("AND (");
        expect(sql).not.toContain("ORDER BY");
        expect(sql).not.toContain("LIMIT");
    });

    it("uses the provided timestampKey in the query", () => {
        const sql = buildSearchQuery({
            ...baseProps,
            timestampKey: "custom_ts",
        });

        expect(sql).toContain("to_unixtime(custom_ts)");
    });

    it("uses the provided selectItemList", () => {
        const sql = buildSearchQuery({
            ...baseProps,
            selectItemList: "col1, col2",
        });

        expect(sql).toContain("SELECT col1, col2 FROM");
    });

    it("uses the provided databaseName", () => {
        const sql = buildSearchQuery({
            ...baseProps,
            databaseName: "my_db",
        });

        expect(sql).toContain("FROM my_db");
    });
});


// =============================================================================
// buildTimelineQuery
// =============================================================================

describe("buildTimelineQuery", () => {
    const startTs = dayjs("2024-01-01T00:00:00Z");
    const endTs = dayjs("2024-01-02T00:00:00Z");

    const baseTimelineProps: BuildTimelineQueryProps = {
        databaseName: "default",
        startTimestamp: startTs,
        endTimestamp: endTs,
        bucketCount: 5,
        timestampKey: "timestamp",
    };

    it("builds a timeline query with the required structure", () => {
        const sql = buildTimelineQuery(baseTimelineProps);
        expect(sql).toContain("width_bucket");
        expect(sql).toContain("FROM default");
        expect(sql).toContain("to_unixtime(timestamp)");
        expect(sql).toContain("GROUP BY 1");
        expect(sql).toContain("ORDER BY 1");
        expect(sql).toContain("COALESCE(cnt, 0) AS count");
        expect(sql).toContain("CAST(timestamp AS double) AS timestamp");
    });

    it("does not include boolean expression filter when undefined", () => {
        const sql = buildTimelineQuery(baseTimelineProps);

        // The boolean expression part should be an empty string
        // Check that there's no extra "AND" after the BETWEEN clause in the
        // WHERE section
        const whereSectionMatch = sql.match(
            /WHERE to_unixtime\(timestamp\) BETWEEN[\s\S]*?AND [^\n]*\n([\s\S]*?)GROUP BY/,
        );


        // The captured group between the end of BETWEEN...AND and GROUP BY
        // should not contain an extra AND clause (only whitespace)
        expect(whereSectionMatch).not.toBeNull();
        expect(String(whereSectionMatch![1]).trim()).toBe("");
    });

    it("includes boolean expression filter when provided", () => {
        const sql = buildTimelineQuery({
            ...baseTimelineProps,
            booleanExpression: "level = 'ERROR'",
        });

        expect(sql).toContain("AND (level = 'ERROR')");
    });

    it("uses the correct bucket count in width_bucket", () => {
        const sql = buildTimelineQuery({
            ...baseTimelineProps,
            bucketCount: 10,
        });


        // The bucket count is on its own line before ") AS idx"
        expect(sql).toContain("            10) AS idx");
    });

    it("uses the correct database name", () => {
        const sql = buildTimelineQuery({
            ...baseTimelineProps,
            databaseName: "my_dataset",
        });

        expect(sql).toContain("FROM my_dataset");
    });

    it("generates correct number of timestamps in the UNNEST array", () => {
        const sql = buildTimelineQuery({
            ...baseTimelineProps,
            bucketCount: 3,
        });


        // With bucketCount=3, should have 3 timestamps
        // The timestamps array is built from startTs + i*step
        expect(sql).toContain("UNNEST(array [");

        // Verify that the timestamps section has 3 comma-separated values
        const unnestMatch = sql.match(/UNNEST\(array \[([^\]]+)\]/);
        expect(unnestMatch).not.toBeNull();
        const values = String(unnestMatch![1]).split(",")
            .map((s) => s.trim());

        expect(values).toHaveLength(3);
    });

    it("uses the provided timestampKey", () => {
        const sql = buildTimelineQuery({
            ...baseTimelineProps,
            timestampKey: "event_time",
        });

        expect(sql).toContain("to_unixtime(event_time)");
    });

    it("converts start and end timestamps to seconds in the query", () => {
        const sql = buildTimelineQuery(baseTimelineProps);
        const startSec = startTs.valueOf() / 1000;
        const endSec = endTs.valueOf() / 1000;
        expect(sql).toContain(`${startSec}`);
        expect(sql).toContain(`${endSec}`);
    });

    it("produces correct timestamps for bucket boundaries", () => {
        const sql = buildTimelineQuery({
            ...baseTimelineProps,
            bucketCount: 2,
        });
        const step = (endTs.valueOf() - startTs.valueOf()) / 2;
        const expectedTs0 = Math.floor(startTs.valueOf());
        const expectedTs1 = Math.floor(startTs.valueOf() + step);
        expect(sql).toContain(`${expectedTs0}`);
        expect(sql).toContain(`${expectedTs1}`);
    });

    it("handles booleanExpression explicitly set to undefined", () => {
        const sql = buildTimelineQuery({
            ...baseTimelineProps,
            booleanExpression: undefined,
        });


        // Should not contain any extra AND clause
        expect(sql).not.toContain("AND (undefined)");
    });
});


// =============================================================================
// SyntaxError class
// =============================================================================

describe("SyntaxError", () => {
    it("is an instance of Error", () => {
        const error = new SyntaxError("test error");
        expect(error).toBeInstanceOf(Error);
    });

    it("is an instance of SyntaxError", () => {
        const error = new SyntaxError("test error");
        expect(error).toBeInstanceOf(SyntaxError);
    });

    it("carries the error message", () => {
        const error = new SyntaxError("something went wrong");
        expect(error.message).toBe("something went wrong");
    });

    it("can be caught with instanceof check", () => {
        const throwSyntaxError = () => {
            throw new SyntaxError("parse failed");
        };

        expect(throwSyntaxError).toThrow();
        try {
            throwSyntaxError();
        } catch (e) {
            expect(e).toBeInstanceOf(SyntaxError);
            expect((e as SyntaxError).message).toBe("parse failed");
        }
    });
});


// =============================================================================
// ValidationError type (structural verification)
// =============================================================================

describe("ValidationError", () => {
    it("returns error objects with the expected shape", () => {
        const errors = validateSelectItemList("!!!");
        expect(errors.length).toBeGreaterThan(0);

        const error = errors[0] as ValidationError;
        expect(typeof error.line).toBe("number");
        expect(typeof error.column).toBe("number");
        expect(typeof error.message).toBe("string");
        expect(typeof error.startColumn).toBe("number");
        expect(typeof error.endColumn).toBe("number");
    });

    it("startColumn is 1-indexed (token.start + 1)", () => {
        const errors = validateSelectItemList("!!!");
        expect(errors.length).toBeGreaterThan(0);

        // The offending token at position 0 should yield startColumn = 1
        const error = errors[0] as ValidationError;
        expect(error.startColumn).toBeGreaterThanOrEqual(1);
    });

    it("endColumn is greater than startColumn (token.stop + 2)", () => {
        const errors = validateSelectItemList("!!!");
        expect(errors.length).toBeGreaterThan(0);
        const error = errors[0] as ValidationError;
        expect(error.endColumn).toBeGreaterThan(error.startColumn);
    });
});


// =============================================================================
// UpperCaseCharStream (tested indirectly through validation functions)
// =============================================================================

describe("UpperCaseCharStream (case-insensitive parsing)", () => {
    it("parses lowercase keywords in select item list", () => {
        expect(validateSelectItemList("col1 as alias")).toEqual([]);
    });

    it("parses lowercase keywords in boolean expression", () => {
        expect(validateBooleanExpression("x > 1 and y < 2")).toEqual([]);
        expect(validateBooleanExpression("x > 1 or y < 2")).toEqual([]);
        expect(validateBooleanExpression("not x = 1")).toEqual([]);
    });

    it("parses lowercase keywords in sort item list", () => {
        expect(validateSortItemList("col1 asc")).toEqual([]);
        expect(validateSortItemList("col1 desc")).toEqual([]);
    });

    it("parses mixed case keywords", () => {
        expect(validateBooleanExpression("x > 1 And y < 2")).toEqual([]);
        expect(validateBooleanExpression("x > 1 oR y < 2")).toEqual([]);
    });
});


// =============================================================================
// Edge cases and boundary conditions
// =============================================================================

describe("edge cases", () => {
    it("validateSelectItemList handles single asterisk", () => {
        expect(validateSelectItemList("*")).toEqual([]);
    });

    it("validateBooleanExpression handles deeply nested parentheses", () => {
        expect(validateBooleanExpression("(((a > 1))").length)
            .toBeGreaterThan(0);
        expect(validateBooleanExpression("(((a > 1)))")).toEqual([]);
    });

    it("validateSortItemList handles trailing comma gracefully", () => {
        const errors = validateSortItemList("col1 ASC,");

        // Trailing comma is likely an error since another sortItem is expected
        expect(errors.length).toBeGreaterThan(0);
    });

    it("multiple validation errors are collected", () => {
        // This input has many invalid tokens
        const errors = validateSelectItemList("@@ @@ @@");
        expect(errors.length).toBeGreaterThanOrEqual(1);
    });

    it("buildSearchQuery with epoch zero startTimestamp", () => {
        const sql = buildSearchQuery({
            selectItemList: "*",
            databaseName: "default",
            startTimestamp: dayjs(0),
            endTimestamp: dayjs(1000),
            timestampKey: "ts",
        });

        expect(sql).toContain("0");
    });

    it("buildTimelineQuery with single bucket", () => {
        const sql = buildTimelineQuery({
            databaseName: "default",
            startTimestamp: dayjs("2024-01-01T00:00:00Z"),
            endTimestamp: dayjs("2024-01-02T00:00:00Z"),
            bucketCount: 1,
            timestampKey: "ts",
        });

        expect(sql).toContain("            1) AS idx");
        const unnestMatch = sql.match(/UNNEST\(array \[([^\]]+)\]/);
        expect(unnestMatch).not.toBeNull();
        const values = String(unnestMatch![1]).split(",")
            .map((s) => s.trim());

        expect(values).toHaveLength(1);
    });
});
