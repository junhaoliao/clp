import {
    describe,
    expect,
    it,
} from "vitest";

import {schemaRoutes} from "../schemas.js";


describe("Schema CRUD Routes", () => {
    const app = schemaRoutes;

    describe("GET / - List schemas", () => {
        it("should return empty array initially", async () => {
            const res = await app.request("/", {method: "GET"});
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual([]);
        });
    });

    describe("POST / - Create schema", () => {
        it("should create a schema with required fields", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "test-schema", content: ":timestamp:string"}),
            });

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.name).toBe("test-schema");
            expect(body.content).toBe(":timestamp:string");
            expect(body.id).toBeDefined();
        });

        it("should reject schema without name", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({content: ":timestamp:string"}),
            });

            expect(res.status).toBe(400);
        });

        it("should reject schema without content", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "test-schema"}),
            });

            expect(res.status).toBe(400);
        });
    });

    describe("GET /:id - Get schema", () => {
        it("should return 404 for non-existent schema", async () => {
            const res = await app.request("/nonexistent", {method: "GET"});
            expect(res.status).toBe(404);
        });

        it("should return created schema", async () => {
            const createRes = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "get-test", content: ":level:string"}),
            });
            const created = await createRes.json();
            const res = await app.request(`/${created.id}`, {method: "GET"});
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.name).toBe("get-test");
            expect(body.id).toBe(created.id);
        });
    });

    describe("PUT /:id - Update schema", () => {
        it("should update schema name", async () => {
            const createRes = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "old-name", content: ":x:string"}),
            });
            const created = await createRes.json();
            const res = await app.request(`/${created.id}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "new-name"}),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.name).toBe("new-name");
        });

        it("should return 404 for non-existent schema", async () => {
            const res = await app.request("/nonexistent", {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "x"}),
            });

            expect(res.status).toBe(404);
        });
    });

    describe("DELETE /:id - Delete schema", () => {
        it("should delete existing schema", async () => {
            const createRes = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "to-delete", content: ":y:int"}),
            });
            const created = await createRes.json();
            const res = await app.request(`/${created.id}`, {method: "DELETE"});
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it("should return 404 for non-existent schema", async () => {
            const res = await app.request("/nonexistent", {method: "DELETE"});
            expect(res.status).toBe(404);
        });
    });

    describe("POST /validate - Validate schema content", () => {
        it("should reject whitespace-only content", async () => {
            const res = await app.request("/validate", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({content: "   "}),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.valid).toBe(false);
            expect(body.errors).toBeDefined();
        });

        it("should reject empty content at validation layer", async () => {
            const res = await app.request("/validate", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({content: ""}),
            });

            expect(res.status).toBe(400);
        });

        it("should validate well-formed schema content", async () => {
            const res = await app.request("/validate", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({content: ":timestamp:string"}),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.valid).toBe(true);
        });
    });
});
