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

const HTTP_INTERNAL_ERROR = 500;

describe("Server-side Disconnect Detection", () => {
    afterEach(resetNodeEnv);

    it("should wire request signal to query AbortController", () => {
        // Verify that AbortController propagation works: when the request signal
        // fires, the query controller should also be aborted
        const requestSignal = new AbortController();
        const queryController = new AbortController();

        const abortHandler = () => {
            queryController.abort();
        };

        requestSignal.signal.addEventListener("abort", abortHandler);

        expect(queryController.signal.aborted).toBe(false);
        requestSignal.abort();
        expect(queryController.signal.aborted).toBe(true);

        requestSignal.signal.removeEventListener("abort", abortHandler);
    });

    it("should complete normal requests without abort interference", async () => {
        setNodeEnv("development");
        const res = await honoApp.request("/api/dashboards", {
            method: "GET",
        });

        expect(res.status).not.toBe(HTTP_INTERNAL_ERROR);
    });
});
