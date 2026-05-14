import {
    describe,
    expect,
    it,
} from "vitest";

import {
    buildPaginatedUrl,
    isPaginationComplete,
} from "../infinity/pagination";


describe("buildPaginatedUrl", () => {
    it("should append offset and limit params for offset pagination", () => {
        const url = buildPaginatedUrl("https://api.example.com/data", {
            limitParam: "limit",
            mode: "offset",
            offsetParam: "offset",
            page: 1,
            pageSize: 100,
        });

        expect(url).toBe("https://api.example.com/data?offset=0&limit=100");
    });

    it("should append page and per_page params for page pagination", () => {
        const url = buildPaginatedUrl("https://api.example.com/data", {
            limitParam: "per_page",
            mode: "page",
            page: 2,
            pageParam: "page",
            pageSize: 50,
        });

        expect(url).toBe("https://api.example.com/data?page=2&per_page=50");
    });

    it("should preserve existing query params", () => {
        const url = buildPaginatedUrl("https://api.example.com/data?q=test", {
            limitParam: "limit",
            mode: "offset",
            offsetParam: "offset",
            page: 1,
            pageSize: 100,
        });

        expect(url).toContain("q=test");
        expect(url).toContain("offset=0");
    });

    it("should return original URL for none pagination", () => {
        const url = buildPaginatedUrl("https://api.example.com/data", {
            mode: "none",
        });

        expect(url).toBe("https://api.example.com/data");
    });
});

describe("isPaginationComplete", () => {
    it("should return true when result count is less than page size", () => {
        expect(isPaginationComplete({
            mode: "offset",
            pageSize: 100,
            resultCount: 50,
        })).toBe(true);
    });

    it("should return false when result count equals page size", () => {
        expect(isPaginationComplete({
            mode: "offset",
            pageSize: 100,
            resultCount: 100,
        })).toBe(false);
    });

    it("should return true for none pagination", () => {
        expect(isPaginationComplete({
            mode: "none",
            pageSize: 0,
            resultCount: 100,
        })).toBe(true);
    });
});
