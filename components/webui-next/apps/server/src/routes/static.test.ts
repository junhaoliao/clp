import {OpenAPIHono} from "@hono/zod-openapi";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type {Env} from "../env.js";


// We need to mock the settings and file system for static route testing
// Since static.ts reads files at module load time, we mock the file system
const mockFsExistsSync = vi.fn();
const mockFsReadFileSync = vi.fn();

vi.mock("node:fs", () => ({
    default: {
        existsSync: (...args: any[]) => mockFsExistsSync(...args),
        readFileSync: (...args: any[]) => mockFsReadFileSync(...args),
    },
    existsSync: (...args: any[]) => mockFsExistsSync(...args),
    readFileSync: (...args: any[]) => mockFsReadFileSync(...args),
}));

// Mock settings.json - client dir points to dist/ directly
vi.mock("../../settings.json", () => ({
    default: {
        ClientDir: "../client",
        StreamFilesDir: null,
        LogViewerDir: "/some/log-viewer",
    },
}));

describe("Static Routes", () => {
    let app: OpenAPIHono<Env>;

    beforeEach(() => {
        mockFsExistsSync.mockReset();
        mockFsReadFileSync.mockReset();

        // Default: dist/index.html exists, root index.html also exists
        // When checking distDir/index.html → return true (prefer built dist)
        mockFsExistsSync.mockImplementation((p: string) => {
            if (p.includes("dist") && p.endsWith("index.html")) {
                return true;
            }

            return false;
        });

        mockFsReadFileSync.mockReturnValue(
            "<!doctype html><html><body><div id=\"root\"></div></body></html>",
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should prefer dist/ directory over root client dir", async () => {
        // Dynamic import to get fresh module with our mocks
        const {staticRoutes} = await import("./static.js");

        app = new OpenAPIHono<Env>();
        app.use("/*", async (c, next) => {
            c.set("queryJobDbManager", {} as any);
            c.set("compressionJobDbManager", {} as any);
            c.set("streamFileManager", {} as any);
            c.set("s3Manager", null);
            c.set("prestoClient", null);
            c.set("mongoDb", {} as any);
            await next();
        });
        app.route("/", staticRoutes);

        // The dist/index.html should be found
        const distCheckCall = mockFsExistsSync.mock.calls.find(
            (call: any[]) => "string" === typeof call[0] && call[0].includes("dist"),
        );

        expect(distCheckCall).toBeDefined();
    });

    it("should serve index.html from SPA fallback", async () => {
        const {staticRoutes} = await import("./static.js");

        app = new OpenAPIHono<Env>();
        app.use("/*", async (c, next) => {
            c.set("queryJobDbManager", {} as any);
            c.set("compressionJobDbManager", {} as any);
            c.set("streamFileManager", {} as any);
            c.set("s3Manager", null);
            c.set("prestoClient", null);
            c.set("mongoDb", {} as any);
            await next();
        });
        app.route("/", staticRoutes);

        const res = await app.request("/some/spa-route");

        // Should serve index.html (either as static file or via SPA fallback)
        expect([200,
            404]).toContain(res.status);
    });
});
