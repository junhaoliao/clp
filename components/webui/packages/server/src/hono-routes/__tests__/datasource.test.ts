import {
    describe,
    expect,
    it,
} from "vitest";

import {datasourceRoutes} from "../datasource.js";


describe("Datasource Routes", () => {
    const app = datasourceRoutes;

    describe("GET / - List datasources", () => {
        it("should return empty list initially", async () => {
            const res = await app.request("/");
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(Array.isArray(body)).toBe(true);
        });
    });

    describe("POST / - Create datasource", () => {
        it("should create a MySQL datasource", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    name: "CLP MySQL",
                    type: "mysql",
                    config: {host: "localhost", port: 3306},
                }),
            });

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.name).toBe("CLP MySQL");
            expect(body.type).toBe("mysql");
            expect(body.uid).toBeDefined();
        });

        it("should create a datasource as default", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    name: "Default DS",
                    type: "clp",
                    config: {},
                    isDefault: true,
                }),
            });

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.isDefault).toBe(true);
        });

        it("should reject invalid datasource type", async () => {
            const res = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    name: "Bad Type",
                    type: "postgres",
                    config: {},
                }),
            });

            expect(res.status).toBe(400);
        });
    });

    describe("POST /:type/query - Execute query", () => {
        it("should return query results for mysql", async () => {
            const res = await app.request("/mysql/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({queries: []}),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toHaveProperty("data");
        });
    });

    describe("POST /:type/test - Test connection", () => {
        it("should return a status response", async () => {
            const res = await app.request("/mysql/test", {method: "POST"});
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toHaveProperty("status");
            expect(body).toHaveProperty("message");
        });

        it("should return ok for infinity datasource", async () => {
            const res = await app.request("/infinity/test", {method: "POST"});
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.status).toBe("ok");
        });
    });

    describe("GET /:uid - Get datasource", () => {
        it("should return a datasource by uid", async () => {
            const createRes = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "Fetch Me", type: "clp", config: {}}),
            });
            const created = await createRes.json();
            const res = await app.request(`/${created.uid}`);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.name).toBe("Fetch Me");
            expect(body.uid).toBe(created.uid);
        });

        it("should return 404 for non-existent uid", async () => {
            const res = await app.request("/nonexistent");
            expect(res.status).toBe(404);
        });
    });

    describe("PUT /:uid - Update datasource", () => {
        it("should update a datasource name", async () => {
            const createRes = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "Original", type: "mysql", config: {host: "localhost"}}),
            });
            const created = await createRes.json();
            const res = await app.request(`/${created.uid}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "Updated", config: {host: "remote"}}),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.name).toBe("Updated");
        });

        it("should return 404 when updating non-existent datasource", async () => {
            const res = await app.request("/nonexistent", {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "Nope"}),
            });

            expect(res.status).toBe(404);
        });
    });

    describe("DELETE /:uid - Delete datasource", () => {
        it("should delete a datasource", async () => {
            const createRes = await app.request("/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name: "Delete Me", type: "clp", config: {}}),
            });
            const created = await createRes.json();
            const res = await app.request(`/${created.uid}`, {method: "DELETE"});
            expect(res.status).toBe(200);

            // Verify it's gone
            const getRes = await app.request(`/${created.uid}`);
            expect(getRes.status).toBe(404);
        });

        it("should return 404 when deleting non-existent datasource", async () => {
            const res = await app.request("/nonexistent", {method: "DELETE"});
            expect(res.status).toBe(404);
        });
    });
});
