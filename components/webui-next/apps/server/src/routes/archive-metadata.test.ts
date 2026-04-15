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


// Mock the pool module
const mockQuery = vi.fn();
vi.mock("../db/index.js", () => ({
    pool: {query: mockQuery},
}));

import {archiveMetadataRoutes} from "./archive-metadata.js";


describe("Archive Metadata Routes", () => {
    let app: OpenAPIHono<Env>;

    beforeEach(() => {
        app = new OpenAPIHono<Env>();
        app.route("/", archiveMetadataRoutes);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("POST /sql", () => {
        it("should execute SQL and return results", async () => {
            const mockRows = [{id: 1, name: "archive1"}];
            mockQuery.mockResolvedValue([mockRows,
                []]);

            const res = await app.request("/sql", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    queryString: "SELECT * FROM clp_archives LIMIT 10",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(Array.isArray(data)).toBe(true);
            expect(data).toEqual(mockRows);
        });

        it("should reject empty query string", async () => {
            const res = await app.request("/sql", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    queryString: "",
                }),
            });

            expect(res.status).toBe(400);
        });

        it("should reject missing query string", async () => {
            const res = await app.request("/sql", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });
    });
});
