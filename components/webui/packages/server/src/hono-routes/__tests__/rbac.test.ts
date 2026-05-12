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
const HTTP_FORBIDDEN = 403;

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

describe("RBAC Middleware (NFR-11)", () => {
    afterEach(resetNodeEnv);

    it("should allow all requests in development mode", async () => {
        setNodeEnv("development");
        const res = await honoApp.request("/api/dashboards", {
            body: JSON.stringify({title: "test"}),
            headers: {"content-type": "application/json"},
            method: "POST",
        });

        expect(res.status).not.toBe(HTTP_FORBIDDEN);
    });

    it("should allow read requests with viewer role in production", async () => {
        setNodeEnv("production");
        const res = await honoApp.request("/api/dashboards", {
            headers: {"x-clp-gateway": "true", "x-clp-role": "viewer"},
            method: "GET",
        });

        expect(res.status).not.toBe(HTTP_FORBIDDEN);
    });

    it("should reject write requests with viewer role in production", async () => {
        setNodeEnv("production");
        const res = await honoApp.request("/api/dashboards", {
            body: JSON.stringify({title: "test"}),
            headers: {
                "content-type": "application/json",
                "x-clp-gateway": "true",
                "x-clp-role": "viewer",
            },
            method: "POST",
        });

        expect(res.status).toBe(HTTP_FORBIDDEN);
    });
});

describe("RBAC Write Operations (NFR-11)", () => {
    afterEach(resetNodeEnv);

    it("should allow write requests with editor role in production", async () => {
        setNodeEnv("production");
        const res = await honoApp.request("/api/dashboards", {
            body: JSON.stringify({title: "test"}),
            headers: {
                "content-type": "application/json",
                "x-clp-gateway": "true",
                "x-clp-role": "editor",
            },
            method: "POST",
        });

        expect(res.status).not.toBe(HTTP_FORBIDDEN);
    });

    it("should default to viewer role when x-clp-role is missing", async () => {
        setNodeEnv("production");
        const res = await honoApp.request("/api/dashboards", {
            body: JSON.stringify({title: "test"}),
            headers: {
                "content-type": "application/json",
                "x-clp-gateway": "true",
            },
            method: "POST",
        });

        expect(res.status).toBe(HTTP_FORBIDDEN);
    });

    it("should allow admin role to perform write operations", async () => {
        setNodeEnv("production");
        const res = await honoApp.request("/api/dashboards", {
            headers: {"x-clp-gateway": "true", "x-clp-role": "admin"},
            method: "DELETE",
        });

        expect(res.status).not.toBe(HTTP_FORBIDDEN);
    });
});

describe("X-CLP-* Header Spoofing Prevention (NFR-12)", () => {
    afterEach(resetNodeEnv);

    it("should reject x-clp-role header without gateway header in production", async () => {
        setNodeEnv("production");
        const res = await honoApp.request("/api/dashboards", {
            headers: {"x-clp-role": "admin"},
            method: "GET",
        });

        expect(res.status).toBe(HTTP_FORBIDDEN);
    });

    it("should allow x-clp-role header with gateway header in production", async () => {
        setNodeEnv("production");
        const res = await honoApp.request("/api/dashboards", {
            headers: {"x-clp-gateway": "true", "x-clp-role": "viewer"},
            method: "GET",
        });

        expect(res.status).not.toBe(HTTP_FORBIDDEN);
    });

    it("should not check headers in development mode", async () => {
        setNodeEnv("development");
        const res = await honoApp.request("/api/dashboards", {
            headers: {"x-clp-role": "admin"},
            method: "GET",
        });

        expect(res.status).not.toBe(HTTP_FORBIDDEN);
    });

    it("should reject x-clp-permissions header without gateway header", async () => {
        setNodeEnv("production");
        const res = await honoApp.request("/api/dashboards", {
            headers: {"x-clp-permissions": "dataset1,dataset2"},
            method: "GET",
        });

        expect(res.status).toBe(HTTP_FORBIDDEN);
    });
});
