import {describe, it, expect} from "vitest";
import {dashboardRoutes} from "../dashboards.js";

describe("Dashboard CRUD Routes", () => {
  const app = dashboardRoutes;

  describe("POST / - Create dashboard", () => {
    it("should create a dashboard with required fields", async () => {
      const res = await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Test Dashboard"}),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.title).toBe("Test Dashboard");
      expect(body.uid).toBeDefined();
      expect(body.version).toBe(1);
      expect(body.panels).toEqual([]);
      expect(body.tags).toEqual([]);
      expect(body.id).toBeDefined();
    });

    it("should create a dashboard with custom uid", async () => {
      const res = await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Custom UID", uid: "my-custom-uid"}),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.uid).toBe("my-custom-uid");
    });

    it("should create a dashboard with all optional fields", async () => {
      const res = await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          title: "Full Dashboard",
          description: "A test dashboard",
          tags: ["test", "demo"],
          timeRange: {from: "now-24h", to: "now"},
          refreshInterval: "30s",
          variables: [{
            id: "v1",
            name: "dataset",
            type: "custom",
          }],
          panels: [{
            id: "p1",
            type: "timeseries",
            title: "CPU Usage",
            gridPos: {x: 0, y: 0, w: 6, h: 4},
            datasource: {type: "mysql", uid: "ds1"},
            queries: [{refId: "A", datasource: {type: "mysql", uid: "ds1"}, query: "SELECT * FROM cpu"}],
            options: {},
          }],
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.description).toBe("A test dashboard");
      expect(body.tags).toEqual(["test", "demo"]);
      expect(body.panels).toHaveLength(1);
      expect(body.variables).toHaveLength(1);
    });

    it("should reject invalid request body", async () => {
      const res = await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({}),  // Missing required title
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET / - List dashboards", () => {
    it("should return empty list initially", async () => {
      // Each test gets its own module state, so we create first
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Dashboard 1"}),
      });

      const res = await app.request("/");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty("uid");
      expect(body[0]).toHaveProperty("title");
      expect(body[0]).not.toHaveProperty("panels");  // Summary only
    });
  });

  describe("GET /:uid - Get dashboard", () => {
    it("should return a dashboard by uid", async () => {
      const createRes = await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Get Test", uid: "get-test-uid"}),
      });
      await createRes.json();

      const res = await app.request("/get-test-uid");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.uid).toBe("get-test-uid");
      expect(body.title).toBe("Get Test");
      expect(body.panels).toBeDefined();
    });

    it("should return 404 for non-existent uid", async () => {
      const res = await app.request("/non-existent");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /:uid - Update dashboard", () => {
    it("should update a dashboard with valid version", async () => {
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Original", uid: "update-test"}),
      });
      const created = await (await app.request("/update-test")).json();

      const res = await app.request("/update-test", {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          title: "Updated",
          version: created.version,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe("Updated");
      expect(body.version).toBe(created.version + 1);
    });

    it("should reject update with wrong version (conflict)", async () => {
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Conflict Test", uid: "conflict-test"}),
      });

      const res = await app.request("/conflict-test", {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          title: "Conflict",
          version: 999,  // Wrong version
        }),
      });
      expect(res.status).toBe(409);
    });

    it("should return 404 for non-existent uid", async () => {
      const res = await app.request("/non-existent", {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "X", version: 1}),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /:uid - Delete dashboard", () => {
    it("should delete an existing dashboard", async () => {
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Delete Me", uid: "delete-test"}),
      });

      const res = await app.request("/delete-test", {method: "DELETE"});
      expect(res.status).toBe(200);

      const getRes = await app.request("/delete-test");
      expect(getRes.status).toBe(404);
    });

    it("should return 404 for non-existent uid", async () => {
      const res = await app.request("/non-existent", {method: "DELETE"});
      expect(res.status).toBe(404);
    });
  });

  describe("POST /:uid/duplicate - Duplicate dashboard", () => {
    it("should duplicate an existing dashboard", async () => {
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Original", uid: "dup-source"}),
      });

      const res = await app.request("/dup-source/duplicate", {method: "POST"});
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.title).toBe("Original (Copy)");
      expect(body.uid).not.toBe("dup-source");
      expect(body.version).toBe(1);
    });

    it("should return 404 for non-existent uid", async () => {
      const res = await app.request("/non-existent/duplicate", {method: "POST"});
      expect(res.status).toBe(404);
    });
  });

  describe("POST /bulk-delete - Bulk delete dashboards", () => {
    it("should delete multiple dashboards", async () => {
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Bulk1", uid: "bulk-1"}),
      });
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Bulk2", uid: "bulk-2"}),
      });

      const res = await app.request("/bulk-delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({uids: ["bulk-1", "bulk-2"]}),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deleted).toBe(2);
      expect(body.failed).toBe(0);
    });

    it("should return 400 for empty uids array", async () => {
      const res = await app.request("/bulk-delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({uids: []}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /:uid/annotations - List annotations", () => {
    it("should return annotations for a dashboard", async () => {
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Annotations Test", uid: "ann-test"}),
      });

      const res = await app.request("/ann-test/annotations");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it("should return 404 for non-existent dashboard", async () => {
      const res = await app.request("/non-existent/annotations");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /:uid/annotations - Create annotation", () => {
    it("should create an annotation on a dashboard", async () => {
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Ann Create Test", uid: "ann-create"}),
      });

      const res = await app.request("/ann-create/annotations", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({time: Date.now(), title: "Deploy v1.0", tags: ["deploy"], color: "#22c55e"}),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.title).toBe("Deploy v1.0");
    });
  });

  describe("DELETE /:uid/annotations/:annotationId - Delete annotation", () => {
    it("should delete an annotation", async () => {
      await app.request("/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Ann Delete Test", uid: "ann-delete"}),
      });

      const createRes = await app.request("/ann-delete/annotations", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({time: Date.now(), title: "To Delete"}),
      });
      const annotation = await createRes.json();

      const deleteRes = await app.request(`/ann-delete/annotations/${annotation.id}`, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);
    });
  });
});
