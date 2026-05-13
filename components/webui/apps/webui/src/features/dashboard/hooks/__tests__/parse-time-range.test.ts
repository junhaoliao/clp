import {
    describe,
    expect,
    it,
} from "vitest";

import {parseTimeRange} from "../parse-time-range";


describe("parseTimeRange", () => {
    it('returns truncated Date.now() for "now"', () => {
        const before = Math.floor(Date.now() / 1000) * 1000;
        const result = parseTimeRange("now");
        const after = Math.floor(Date.now() / 1000) * 1000;
        expect(result).toBeGreaterThanOrEqual(before);
        expect(result).toBeLessThanOrEqual(after);
        expect(result % 1000).toBe(0);
    });

    it("parses now-Xh relative expressions using dayjs", () => {
        const result = parseTimeRange("now-6h");
        const expected = Math.floor((Date.now() - 6 * 3600000) / 1000) * 1000;

        // Allow 1 second tolerance for test execution time
        expect(Math.abs(result - expected)).toBeLessThanOrEqual(1000);
    });

    it("parses now-Xm relative expressions", () => {
        const result = parseTimeRange("now-30m");
        const expected = Math.floor((Date.now() - 30 * 60000) / 1000) * 1000;
        expect(Math.abs(result - expected)).toBeLessThanOrEqual(1000);
    });

    it("parses now-Xd relative expressions", () => {
        const result = parseTimeRange("now-7d");
        const expected = Math.floor((Date.now() - 7 * 86400000) / 1000) * 1000;
        expect(Math.abs(result - expected)).toBeLessThanOrEqual(1000);
    });

    it("parses now-Xs second granularity expressions", () => {
        const result = parseTimeRange("now-300s");
        const expected = Math.floor((Date.now() - 300000) / 1000) * 1000;
        expect(Math.abs(result - expected)).toBeLessThanOrEqual(1000);
    });

    it("returns numeric timestamps directly", () => {
        const ts = 1715000000000;
        expect(parseTimeRange(String(ts))).toBe(ts);
    });

    it("truncates numeric timestamps to second granularity", () => {
        const ts = 1715000000123;
        expect(parseTimeRange(String(ts))).toBe(1715000000000);
    });

    it("returns truncated Date.now() for unrecognized strings", () => {
        const result = parseTimeRange("invalid");
        const expected = Math.floor(Date.now() / 1000) * 1000;
        expect(Math.abs(result - expected)).toBeLessThanOrEqual(1000);
    });

    it("parses datetime-local strings (YYYY-MM-DDTHH:mm:ss)", () => {
        const result = parseTimeRange("2023-03-01T00:00:00");
        expect(result % 1000).toBe(0);

        // dayjs parses datetime-local in local timezone
        const expected = new Date(2023, 2, 1, 0, 0, 0).getTime();
        expect(result).toBe(Math.floor(expected / 1000) * 1000);
    });

    it("parses datetime-local strings with partial time", () => {
        const result = parseTimeRange("2023-03-01T12:30");
        expect(result % 1000).toBe(0);

        // 2023-03-01T12:30:00 in local time
        const expected = new Date(2023, 2, 1, 12, 30, 0).getTime();
        expect(result).toBe(Math.floor(expected / 1000) * 1000);
    });
});
