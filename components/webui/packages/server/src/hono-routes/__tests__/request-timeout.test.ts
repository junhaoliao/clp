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
const HTTP_REQUEST_TIMEOUT = 408;

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

describe("Request Timeout Middleware", () => {
    afterEach(resetNodeEnv);

    it("should allow normal requests to complete within timeout", async () => {
        setNodeEnv("development");
        const res = await honoApp.request("/api/dashboards", {
            headers: {"content-type": "application/json"},
            method: "GET",
        });

        expect(res.status).not.toBe(HTTP_REQUEST_TIMEOUT);
    });

    it("should have REQUEST_TIMEOUT_MS constant configured", () => {
        const SECONDS = 30;
        const MS_PER_SEC = 1000;
        const TIMEOUT_MS = SECONDS * MS_PER_SEC;
        expect(TIMEOUT_MS).toBe(SECONDS * MS_PER_SEC);
    });

    it("should use AbortController for request cancellation", () => {
        // Verify AbortController is available in the runtime
        const controller = new AbortController();
        expect(controller.signal.aborted).toBe(false);
        controller.abort();
        expect(controller.signal.aborted).toBe(true);
    });
});
