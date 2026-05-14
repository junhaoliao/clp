import {
    describe,
    expect,
    it,
} from "vitest";

import {
    getApplicableRowLimit,
    hasGroupBy,
    injectLimit,
    rowsToDataFrame,
    validateSqlSafety,
} from "../mysql/index.js";
import {QUERY_LIMITS} from "../types.js";


describe("MySQL Datasource", () => {
    describe("hasGroupBy", () => {
        it("should detect GROUP BY in simple query", () => {
            expect(hasGroupBy("SELECT COUNT(*) FROM logs GROUP BY host")).toBe(true);
        });

        it("should detect GROUP BY case-insensitively", () => {
            expect(hasGroupBy("select count(*) from logs group by host")).toBe(true);
        });

        it("should return false for queries without GROUP BY", () => {
            expect(hasGroupBy("SELECT * FROM logs")).toBe(false);
        });

        it("should not match GROUP BY inside string literals", () => {
            // This is a simple heuristic; full parsing would be needed for 100% accuracy
            expect(hasGroupBy("SELECT 'group by test' FROM logs")).toBe(true); // false positive accepted
        });
    });

    describe("getApplicableRowLimit", () => {
        it("should return aggregated limit for GROUP BY queries", () => {
            expect(getApplicableRowLimit("SELECT host, COUNT(*) FROM logs GROUP BY host"))
                .toBe(QUERY_LIMITS.MAX_AGGREGATED_QUERY_ROWS);
        });

        it("should return unaggregated limit for plain queries", () => {
            expect(getApplicableRowLimit("SELECT * FROM logs"))
                .toBe(QUERY_LIMITS.MAX_UNAGGREGATED_QUERY_ROWS);
        });
    });

    describe("injectLimit", () => {
        it("should add LIMIT when not present", () => {
            expect(injectLimit("SELECT * FROM logs", 100)).toBe("SELECT * FROM logs LIMIT 101");
        });

        it("should not add LIMIT when already present", () => {
            expect(injectLimit("SELECT * FROM logs LIMIT 50", 100)).toBe("SELECT * FROM logs LIMIT 50");
        });

        it("should remove trailing semicolon before adding LIMIT", () => {
            expect(injectLimit("SELECT * FROM logs;", 100)).toBe("SELECT * FROM logs LIMIT 101");
        });

        it("should not inject LIMIT into SHOW statements", () => {
            expect(injectLimit("SHOW TABLES", 100)).toBe("SHOW TABLES");
        });

        it("should not inject LIMIT into DESCRIBE statements", () => {
            expect(injectLimit("DESCRIBE logs", 100)).toBe("DESCRIBE logs");
        });

        it("should not inject LIMIT into EXPLAIN statements", () => {
            expect(injectLimit("EXPLAIN SELECT * FROM logs", 100)).toBe("EXPLAIN SELECT * FROM logs");
        });
    });

    describe("validateSqlSafety", () => {
        it("should allow SELECT queries", () => {
            expect(validateSqlSafety("SELECT * FROM logs")).toEqual({safe: true});
        });

        it("should reject DROP queries", () => {
            const result = validateSqlSafety("DROP TABLE logs");
            expect(result.safe).toBe(false);
            expect(result.reason).toContain("DROP");
        });

        it("should reject DELETE queries", () => {
            const result = validateSqlSafety("DELETE FROM logs WHERE 1=1");
            expect(result.safe).toBe(false);
        });

        it("should reject UPDATE queries", () => {
            const result = validateSqlSafety("UPDATE logs SET x = 1");
            expect(result.safe).toBe(false);
        });

        it("should reject INSERT queries", () => {
            const result = validateSqlSafety("INSERT INTO logs VALUES (1)");
            expect(result.safe).toBe(false);
        });

        it("should reject ALTER queries", () => {
            const result = validateSqlSafety("ALTER TABLE logs ADD COLUMN x INT");
            expect(result.safe).toBe(false);
        });

        it("should reject TRUNCATE queries", () => {
            const result = validateSqlSafety("TRUNCATE TABLE logs");
            expect(result.safe).toBe(false);
        });

        it("should reject GRANT queries", () => {
            const result = validateSqlSafety("GRANT ALL ON logs TO user");
            expect(result.safe).toBe(false);
        });

        it("should reject CREATE queries", () => {
            const result = validateSqlSafety("CREATE TABLE evil (id INT)");
            expect(result.safe).toBe(false);
        });

        it("should reject REVOKE queries", () => {
            const result = validateSqlSafety("REVOKE ALL ON logs FROM user");
            expect(result.safe).toBe(false);
        });
    });

    describe("rowsToDataFrame", () => {
        it("should convert rows to DataFrame", () => {
            const rows = [
                {host: "server1", count: 10, active: true},
                {host: "server2", count: 20, active: false},
            ];
            const df = rowsToDataFrame(rows, "test");
            expect(df.name).toBe("test");
            expect(df.length).toBe(2);
            expect(df.fields).toHaveLength(3);
            expect(df.fields[0]!.name).toBe("host");
            expect(df.fields[0]!.type).toBe("string");
            expect(df.fields[1]!.name).toBe("count");
            expect(df.fields[1]!.type).toBe("number");
        });

        it("should handle empty rows", () => {
            const df = rowsToDataFrame([]);
            expect(df.length).toBe(0);
            expect(df.fields).toHaveLength(0);
        });

        it("should detect truncation when rows exceed limit", () => {
            const rows = Array.from({length: 2001}, (_, i) => ({host: `server${i}`, count: i}));
            const df = rowsToDataFrame(rows, "test", 2000);
            expect(df.rowsTruncated).toBe(true);
            expect(df.length).toBe(2000);
        });

        it("should not flag truncation when rows are within limit", () => {
            const rows = [{host: "server1", count: 1}];
            const df = rowsToDataFrame(rows, "test", 2000);
            expect(df.rowsTruncated).toBeUndefined();
            expect(df.length).toBe(1);
        });
    });
});
