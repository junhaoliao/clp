import {
    describe,
    expect,
    it,
} from "vitest";

import {buildAuthHeaders} from "../infinity/auth.js";


describe("buildAuthHeaders", () => {
    it("should return empty headers for no auth", () => {
        const headers = buildAuthHeaders({type: "none"});
        expect(headers).toEqual({});
    });

    it("should return Basic auth header for basic auth", () => {
        const headers = buildAuthHeaders({
            password: "s3cret",
            type: "basic",
            username: "admin",
        });
        const EXPECTED_PREFIX = "Basic ";
        // eslint-disable-next-line dot-notation
        expect(headers["Authorization"]).toBeDefined();
        // eslint-disable-next-line dot-notation
        expect(headers["Authorization"]!.startsWith(EXPECTED_PREFIX)).toBe(true);
    });

    it("should return API key header for apikey auth", () => {
        const headers = buildAuthHeaders({
            key: "X-API-Key",
            type: "apikey",
            value: "my-secret-key",
        });

        expect(headers).toEqual({"X-API-Key": "my-secret-key"});
    });

    it("should return empty headers for undefined auth", () => {
        const headers = buildAuthHeaders(undefined);
        expect(headers).toEqual({});
    });
});

describe("Auth header integration", () => {
    it("should merge auth headers with existing urlOptions headers", () => {
        const authHeaders = buildAuthHeaders({
            key: "X-API-Key",
            type: "apikey",
            value: "my-key",
        });
        const existingHeaders: Record<string, string> = {
            Accept: "application/json",
        };
        const merged = {...existingHeaders, ...authHeaders};
        expect(merged).toEqual({
            "Accept": "application/json",
            "X-API-Key": "my-key",
        });
    });

    it("should allow auth headers to override existing headers", () => {
        const authHeaders = buildAuthHeaders({
            key: "Authorization",
            type: "apikey",
            value: "Bearer token",
        });
        const existingHeaders: Record<string, string> = {
            Authorization: "Basic old",
        };
        const merged = {...existingHeaders, ...authHeaders};
        // eslint-disable-next-line dot-notation
        expect(merged["Authorization"]).toBe("Bearer token");
    });
});
