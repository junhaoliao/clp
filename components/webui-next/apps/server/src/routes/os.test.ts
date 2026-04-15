import fs from "node:fs/promises";

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



// Use vi.spyOn instead of vi.mock to avoid hoisting issues
import {osRoutes} from "./os.js";


describe("OS Routes", () => {
    let app: OpenAPIHono<Env>;
    let accessSpy: ReturnType<typeof vi.spyOn>;
    let readdirSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        app = new OpenAPIHono<Env>();
        app.route("/", osRoutes);
        accessSpy = vi.spyOn(fs, "access");
        readdirSpy = vi.spyOn(fs, "readdir");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("GET /ls", () => {
        it("should return directory listing", async () => {
            accessSpy.mockResolvedValue(undefined);
            readdirSpy.mockResolvedValue([
                {name: "file1.log", isDirectory: () => false} as any,
                {name: "subdir", isDirectory: () => true} as any,
            ]);

            const res = await app.request("/ls?path=/test");

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toHaveLength(2);
            expect(data[0]).toEqual({
                isExpandable: false,
                name: "file1.log",
                parentPath: "/test",
            });
            expect(data[1]).toEqual({
                isExpandable: true,
                name: "subdir",
                parentPath: "/test",
            });
        });

        it("should default path to /", async () => {
            accessSpy.mockResolvedValue(undefined);
            readdirSpy.mockResolvedValue([]);

            const res = await app.request("/ls");

            expect(res.status).toBe(200);
            expect(accessSpy).toHaveBeenCalledWith("/");
        });

        it("should return 404 for non-existent path", async () => {
            accessSpy.mockRejectedValue(new Error("ENOENT"));

            const res = await app.request("/ls?path=/nonexistent");

            expect(res.status).toBe(404);
        });
    });
});
