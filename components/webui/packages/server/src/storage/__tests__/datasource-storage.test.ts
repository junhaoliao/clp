import type {DatasourceInstance} from "@webui/common/dashboard/types";
import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {InMemoryDatasourceStorage} from "../datasource-storage.js";


describe("InMemoryDatasourceStorage", () => {
    let storage: InMemoryDatasourceStorage;

    beforeEach(() => {
        storage = new InMemoryDatasourceStorage();
    });

    const makeDatasource = (uid: string, name: string): DatasourceInstance => ({
        id: `id-${uid}`,
        uid,
        name,
        type: "mysql",
        config: {host: "localhost", port: 3306},
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    it("should create and retrieve a datasource", async () => {
        const ds = makeDatasource("ds1", "MySQL");
        await storage.create(ds);
        const result = await storage.get("ds1");
        expect(result).toEqual(ds);
    });

    it("should return null for non-existent datasource", async () => {
        const result = await storage.get("nope");
        expect(result).toBeNull();
    });

    it("should list all datasources", async () => {
        await storage.create(makeDatasource("a", "DS A"));
        await storage.create(makeDatasource("b", "DS B"));
        const list = await storage.list();
        expect(list).toHaveLength(2);
    });

    it("should delete a datasource", async () => {
        await storage.create(makeDatasource("del", "To Delete"));
        const result = await storage.delete("del");
        expect(result).toBe(true);
        const fetched = await storage.get("del");
        expect(fetched).toBeNull();
    });

    it("should return false when deleting non-existent datasource", async () => {
        const result = await storage.delete("nope");
        expect(result).toBe(false);
    });
});
