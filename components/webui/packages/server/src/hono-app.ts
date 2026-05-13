import {Hono} from "hono";

import {dashboardRoutes} from "./hono-routes/dashboards.js";
import {datasourceRoutes} from "./hono-routes/datasource.js";


const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const MAX_BODY_SIZE = BYTES_PER_MB;
const MAX_RESPONSE_SIZE = 50 * BYTES_PER_MB;
const CLP_HEADER_PREFIX = "x-clp-";
const GATEWAY_HEADER = "x-clp-gateway";
const HTTP_FORBIDDEN = 403;
const HTTP_RATE_LIMITED = 429;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_REQUEST_TIMEOUT = 408;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_HITS = 100;
const SERVER_REQUEST_TIMEOUT_MS = 120_000;
const MS_PER_SECOND = 1000;

type Role = "viewer" | "editor" | "admin";

const ROLE_HIERARCHY: Record<Role, number> = {admin: 2, editor: 1, viewer: 0};

const WRITE_METHODS = new Set(["POST",
    "PUT",
    "PATCH",
    "DELETE"]);

/**
 *
 */
function isProduction (): boolean {
    // eslint-disable-next-line dot-notation
    return "production" === process.env["NODE_ENV"];
}

/**
 *
 * @param c
 * @param c.req
 * @param c.req.header
 */
function getRole (c: {req: {header: (name: string) => string | undefined}}): Role {
    const roleHeader = c.req.header("x-clp-role")?.toLowerCase();
    if (roleHeader && roleHeader in ROLE_HIERARCHY) {
        return roleHeader as Role;
    }

    return "viewer";
}

/**
 *
 * @param userRole
 * @param requiredRole
 */
function hasRole (userRole: Role, requiredRole: Role): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/** Simple in-memory rate limiter */
class RateLimiter {
    private hits = new Map<string, {count: number; resetAt: number}>();

    private maxHits: number;

    private windowMs: number;

    constructor (maxHits: number, windowMs: number) {
        this.maxHits = maxHits;
        this.windowMs = windowMs;
    }

    check (ip: string): {allowed: boolean; remaining: number; resetAt: number} {
        const now = Date.now();
        let entry = this.hits.get(ip);
        if (!entry || now >= entry.resetAt) {
            entry = {count: 0, resetAt: now + this.windowMs};
            this.hits.set(ip, entry);
        }
        entry.count++;
        const allowed = entry.count <= this.maxHits;
        return {allowed: allowed, remaining: Math.max(0, this.maxHits - entry.count), resetAt: entry.resetAt};
    }
}

const dashboardLimiter = new RateLimiter(RATE_LIMIT_MAX_HITS, RATE_LIMIT_WINDOW_MS);

/**
 * Hono app for dashboard + datasource routes.
 * Must use chained route definitions for AppType inference.
 */
export const honoApp = new Hono()

// NFR-12: Reject X-CLP-* headers from untrusted sources (spoofing prevention)
// In production: without a gateway, any x-clp-* header is spoofed → reject.
// With a gateway, only x-clp-role is trusted; other x-clp-* headers are suspicious → reject.
// Gateway marker is preserved here for NFR-11 to check, then deleted in NFR-11 after RBAC.
    .use("/api/*", async (c, next) => {
        if (isProduction()) {
            const hasGatewayHeader = Boolean(c.req.header(GATEWAY_HEADER));
            for (const [key] of c.req.raw.headers.entries()) {
                if (key.startsWith(CLP_HEADER_PREFIX) && key !== GATEWAY_HEADER) {
                    if (!hasGatewayHeader) {
                        c.status(HTTP_FORBIDDEN);

                        return c.json({error: `Rejected spoofed header: ${key}`});
                    } else if (key !== "x-clp-role") {
                        // Gateway present but non-role x-clp-* header is suspicious
                        c.status(HTTP_FORBIDDEN);

                        return c.json({error: `Rejected spoofed header: ${key}`});
                    }
                }
            }
        }

        return next();
    })

// NFR-11: RBAC enforcement in production mode when a gateway is present.
// The gateway is responsible for setting x-clp-role based on authenticated user
// permissions. Without a gateway, requests are direct from trusted clients and
// all operations are permitted.
    .use("/api/*", async (c, next) => {
        if (!isProduction()) {
            return next();
        }
        const hasGateway = Boolean(c.req.header(GATEWAY_HEADER));
        if (!hasGateway) {
            return next();
        }
        const role = getRole(c);
        const {method} = c.req;

        // Write operations require editor role; read operations allow viewer
        if (WRITE_METHODS.has(method) && !hasRole(role, "editor")) {
            c.status(HTTP_FORBIDDEN);

            return c.json({error: "Insufficient permissions for this operation"});
        }

        // Strip gateway marker so downstream can't re-use it
        c.req.raw.headers.delete(GATEWAY_HEADER);

        return next();
    })
    .use("/api/dashboards/*", async (c, next) => {
        const ip = c.req.raw.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.raw.headers.get("x-real-ip") ?? "unknown";
        const {allowed, remaining, resetAt} = dashboardLimiter.check(ip);
        c.header("X-RateLimit-Remaining", String(remaining));
        c.header("X-RateLimit-Reset", String(Math.ceil(resetAt / MS_PER_SECOND)));
        if (!allowed) {
            c.status(HTTP_RATE_LIMITED);

            return c.json({error: "Rate limit exceeded. Try again later."});
        }

        return next();
    })
    .use("/api/dashboards/*", async (c, next) => {
        const contentLength = c.req.raw.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
            c.status(HTTP_PAYLOAD_TOO_LARGE);

            return c.json({error: "Request body exceeds 1MB limit"});
        }

        return next();
    })

// NFR: Request timeout — prevents long-running queries from blocking the server
    .use("/api/*", async (c, next) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, SERVER_REQUEST_TIMEOUT_MS);

        c.req.raw.signal.addEventListener("abort", () => {
            controller.abort();
        });

        try {
            await Promise.race([
                next(),
                new Promise((resolve) => {
                    controller.signal.addEventListener("abort", () => {
                        resolve(null);
                    });
                }),
            ]);
        } finally {
            clearTimeout(timeout);
        }

        if (controller.signal.aborted && !c.req.raw.signal.aborted) {
            c.status(HTTP_REQUEST_TIMEOUT);

            return c.json({error: "Request timed out"});
        }

        return c.body(null);
    })
// NFR: Response payload size limit — prevents sending arbitrarily large JSON responses
    .use("/api/*", async (c, next) => {
        await next();
        const contentType = c.res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
            const body = c.res.clone().body;
            if (body) {
                const reader = body.getReader();
                let totalBytes = 0;
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    totalBytes += value.length;
                    if (totalBytes > MAX_RESPONSE_SIZE) {
                        reader.cancel().catch(() => {});
                        c.res = c.json({error: `Response payload exceeds ${MAX_RESPONSE_SIZE / BYTES_PER_MB}MB limit`}, 413);
                        return;
                    }
                }
            }
        }
    })
    .route("/api/dashboards", dashboardRoutes)
    .route("/api/datasource", datasourceRoutes);

/** Export AppType for client-side typed RPC via hc<AppType>() */
export type AppType = typeof honoApp;
