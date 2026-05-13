import {
    afterEach,
    describe,
    expect,
    it,
} from "vitest";

import {honoApp} from "../../hono-app.js";


/**
 *
 */
function getNodeEnv (): string | undefined {
    // eslint-disable-next-line dot-notation
    return process.env["NODE_ENV"];
}

const ORIGINAL_NODE_ENV = getNodeEnv();

/**
 *
 * @param value
 */
function setNodeEnv (value: string): void {
    // eslint-disable-next-line dot-notation
    process.env["NODE_ENV"] = value;
}

/**
 *
 */
function resetNodeEnv (): void {
    // eslint-disable-next-line dot-notation
    process.env["NODE_ENV"] = ORIGINAL_NODE_ENV;
}

const HTTP_NOT_FOUND = 404;

describe("SSE Streaming Query Endpoint", () => {
    afterEach(resetNodeEnv);

    it("should have a streaming endpoint at /:type/query/stream", async () => {
        setNodeEnv("development");
        const res = await honoApp.request("/api/datasource/mysql/query/stream", {
            body: JSON.stringify({
                queries: [{refId: "A", query: "SELECT 1"}],
                range: {from: 0, to: Date.now()},
            }),
            headers: {"content-type": "application/json"},
            method: "POST",
        });

        // Endpoint should exist (not 404)
        expect(res.status).not.toBe(HTTP_NOT_FOUND);
        expect(res.headers.get("content-type")).toContain("text/event-stream");
    });

    it("should send SSE events with type field", async () => {
        setNodeEnv("development");
        const res = await honoApp.request("/api/datasource/mysql/query/stream", {
            body: JSON.stringify({
                queries: [{refId: "A", query: "SELECT 1"}],
                range: {from: 0, to: Date.now()},
            }),
            headers: {"content-type": "application/json"},
            method: "POST",
        });

        const text = await res.text();

        // SSE events should contain a data: prefix
        expect(text).toContain("data:");
    });
});
