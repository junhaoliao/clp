import type {Dashboard} from "@webui/common/dashboard/types";
import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {InMemoryDashboardStorage} from "../dashboard-storage.js";


describe("InMemoryDashboardStorage", () => {
    let storage: InMemoryDashboardStorage;

    beforeEach(() => {
        storage = new InMemoryDashboardStorage();
    });

    const makeDashboard = (uid: string, title: string): Dashboard => ({
        id: `id-${uid}`,
        uid,
        title,
        tags: [],
        panels: [],
        variables: [],
        timeRange: {from: "now-6h", to: "now"},
        version: 1,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    });

    it("should create and retrieve a dashboard", async () => {
        const dashboard = makeDashboard("abc123", "Test Dashboard");
        await storage.create(dashboard);
        const result = await storage.get("abc123");
        expect(result).toEqual(dashboard);
    });

    it("should return null for non-existent dashboard", async () => {
        const result = await storage.get("nonexistent");
        expect(result).toBeNull();
    });

    it("should list all dashboards", async () => {
        await storage.create(makeDashboard("a", "Dashboard A"));
        await storage.create(makeDashboard("b", "Dashboard B"));
        const list = await storage.list();
        expect(list).toHaveLength(2);
        expect(list.map((d) => d.uid)).toEqual(["a",
            "b"]);
    });

    it("should update a dashboard", async () => {
        const dashboard = makeDashboard("x", "Original");
        await storage.create(dashboard);
        const updated = {...dashboard, title: "Updated", version: 2};
        const result = await storage.update("x", updated);
        expect(result?.title).toBe("Updated");
        const fetched = await storage.get("x");
        expect(fetched?.title).toBe("Updated");
    });

    it("should return null when updating non-existent dashboard", async () => {
        const result = await storage.update("nope", makeDashboard("nope", "Ghost"));
        expect(result).toBeNull();
    });

    it("should delete a dashboard", async () => {
        await storage.create(makeDashboard("del", "To Delete"));
        const result = await storage.delete("del");
        expect(result).toBe(true);
        const fetched = await storage.get("del");
        expect(fetched).toBeNull();
    });

    it("should return false when deleting non-existent dashboard", async () => {
        const result = await storage.delete("nope");
        expect(result).toBe(false);
    });
});
