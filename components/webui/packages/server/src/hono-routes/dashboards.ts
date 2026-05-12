import {Hono} from "hono";
import type {TSchema} from "@sinclair/typebox";
import {tbValidator} from "@hono/typebox-validator";
import {
  CreateDashboardSchema,
  type CreateDashboardRequest,
  UpdateDashboardSchema,
  type UpdateDashboardRequest,
} from "@webui/common/dashboard/schemas";
import type {Annotation, Dashboard} from "@webui/common/dashboard/types";
import {nanoid} from "nanoid";
import type {DashboardStorage} from "../storage/dashboard-storage.js";
import {InMemoryDashboardStorage} from "../storage/dashboard-storage.js";
import {toMySQLDatetime} from "../storage/datetime-utils.js";

/** Dashboard storage (swappable: in-memory for dev, MySQL for production) */
let storage: DashboardStorage = new InMemoryDashboardStorage();

export function setDashboardStorage(s: DashboardStorage): void {
  storage = s;
}

function generateUid(): string {
  return nanoid(10);
}

/** Dashboard CRUD routes (Hono, chained for RPC type inference) */
export const dashboardRoutes = new Hono()
  .get("/", async (c): Promise<Response> => {
    const dashboards = await storage.list();
    return c.json(dashboards);
  })
  .post("/", tbValidator("json", CreateDashboardSchema as unknown as TSchema), async (c) => {
    const body = c.req.valid("json") as CreateDashboardRequest;
    const now = toMySQLDatetime();
    const dashboard: Dashboard = {
      id: nanoid(21),
      uid: body.uid ?? generateUid(),
      title: body.title,
      tags: body.tags ?? [],
      variables: body.variables ?? [],
      timeRange: body.timeRange ?? {from: "now-6h", to: "now"},
      panels: body.panels ?? [],
      version: 1,
      updatedAt: now,
      createdAt: now,
    };
    if (body.description !== undefined) {
      dashboard.description = body.description;
    }
    if (body.refreshInterval !== undefined) {
      dashboard.refreshInterval = body.refreshInterval;
    }
    await storage.create(dashboard);
    return c.json(dashboard, 201);
  })
  .get("/:uid", async (c) => {
    const {uid} = c.req.param();
    const dashboard = await storage.get(uid);
    if (!dashboard) {
      return c.json({error: "Dashboard not found"}, 404);
    }
    return c.json(dashboard);
  })
  .put("/:uid", tbValidator("json", UpdateDashboardSchema as unknown as TSchema), async (c) => {
    const {uid} = c.req.param();
    const existing = await storage.get(uid);
    if (!existing) {
      return c.json({error: "Dashboard not found"}, 404);
    }
    const body = c.req.valid("json") as UpdateDashboardRequest;

    // Optimistic concurrency check
    if (body.version !== existing.version) {
      return c.json({error: "Version conflict", currentVersion: existing.version}, 409);
    }

    const updated: Dashboard = {
      ...existing,
      title: body.title ?? existing.title,
      tags: body.tags ?? existing.tags,
      variables: body.variables ?? existing.variables,
      timeRange: body.timeRange ?? existing.timeRange,
      panels: body.panels ?? existing.panels,
      version: existing.version + 1,
      updatedAt: toMySQLDatetime(),
    };
    if (body.description !== undefined) {
      updated.description = body.description;
    }
    if (body.refreshInterval !== undefined) {
      updated.refreshInterval = body.refreshInterval;
    }
    if (body.tabs !== undefined) {
      updated.tabs = body.tabs;
    }
    const result = await storage.update(uid, updated);
    if (!result) {
      return c.json({error: "Update failed - version conflict"}, 409);
    }
    return c.json(updated);
  })
  .delete("/:uid", async (c) => {
    const {uid} = c.req.param();
    const deleted = await storage.delete(uid);
    if (!deleted) {
      return c.json({error: "Dashboard not found"}, 404);
    }
    return c.json({success: true}, 200);
  })
  .post("/:uid/duplicate", async (c) => {
    const {uid} = c.req.param();
    const existing = await storage.get(uid);
    if (!existing) {
      return c.json({error: "Dashboard not found"}, 404);
    }
    const now = toMySQLDatetime();
    const duplicate: Dashboard = {
      ...existing,
      id: nanoid(21),
      uid: generateUid(),
      title: `${existing.title} (Copy)`,
      version: 1,
      updatedAt: now,
      createdAt: now,
    };
    await storage.create(duplicate);
    return c.json(duplicate, 201);
  })
  .post("/bulk-delete", async (c) => {
    const body = await c.req.json();
    const uids = body.uids as string[];
    if (!Array.isArray(uids) || uids.length === 0) {
      return c.json({error: "uids array is required"}, 400);
    }
    const results = await Promise.allSettled(uids.map((uid: string) => storage.delete(uid)));
    const deleted = results.filter((r) => r.status === "fulfilled" && r.value).length;
    const failed = results.length - deleted;
    return c.json({deleted, failed});
  })
  // Annotation CRUD
  .get("/:uid/annotations", async (c) => {
    const {uid} = c.req.param();
    const dashboard = await storage.get(uid);
    if (!dashboard) {
      return c.json({error: "Dashboard not found"}, 404);
    }
    return c.json(dashboard.annotations ?? []);
  })
  .post("/:uid/annotations", async (c) => {
    const {uid} = c.req.param();
    const dashboard = await storage.get(uid);
    if (!dashboard) {
      return c.json({error: "Dashboard not found"}, 404);
    }
    const body = await c.req.json();
    const annotation: Annotation = {
      id: nanoid(10),
      time: body.time,
      timeEnd: body.timeEnd,
      title: body.title ?? "",
      tags: body.tags,
      color: body.color,
    };
    const annotations = [...(dashboard.annotations ?? []), annotation];
    const updated: Dashboard = {
      ...dashboard,
      annotations,
      version: dashboard.version + 1,
      updatedAt: toMySQLDatetime(),
    };
    await storage.update(uid, updated);
    return c.json(annotation, 201);
  })
  .delete("/:uid/annotations/:annotationId", async (c) => {
    const {uid, annotationId} = c.req.param();
    const dashboard = await storage.get(uid);
    if (!dashboard) {
      return c.json({error: "Dashboard not found"}, 404);
    }
    const annotations = (dashboard.annotations ?? []).filter((a) => a.id !== annotationId);
    const updated: Dashboard = {
      ...dashboard,
      annotations,
      version: dashboard.version + 1,
      updatedAt: toMySQLDatetime(),
    };
    await storage.update(uid, updated);
    return c.json({success: true});
  });

export type DashboardRoutesType = typeof dashboardRoutes;
