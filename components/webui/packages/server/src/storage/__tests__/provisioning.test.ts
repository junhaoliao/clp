import {describe, it, expect, beforeEach} from "vitest";
import {provisionDatasources, type ProvisioningConfig} from "../provisioning.js";
import {InMemoryDatasourceStorage} from "../datasource-storage.js";

describe("provisionDatasources", () => {
  let storage: InMemoryDatasourceStorage;

  beforeEach(() => {
    storage = new InMemoryDatasourceStorage();
  });

  it("should create default datasources when none exist", async () => {
    await provisionDatasources(storage);
    const list = await storage.list();
    expect(list.length).toBeGreaterThanOrEqual(2);
    const names = list.map((ds) => ds.name);
    expect(names).toContain("CLP MySQL");
    expect(names).toContain("CLP Query");
  });

  it("should not duplicate existing datasources", async () => {
    const config: ProvisioningConfig = {
      datasources: [
        {name: "Test DS", type: "mysql", uid: "test-uid", isDefault: true, config: {}},
      ],
    };
    await provisionDatasources(storage, config);
    await provisionDatasources(storage, config);
    const list = await storage.list();
    expect(list).toHaveLength(1);
  });

  it("should create custom datasources from config", async () => {
    const config: ProvisioningConfig = {
      datasources: [
        {name: "My API", type: "infinity", uid: "my-api", isDefault: false, config: {url: "https://api.example.com"}},
        {name: "My DB", type: "mysql", uid: "my-db", isDefault: true, config: {host: "db.example.com"}},
      ],
    };
    await provisionDatasources(storage, config);
    const list = await storage.list();
    expect(list).toHaveLength(2);
    expect(list[0]!.uid).toBe("my-api");
    expect(list[1]!.uid).toBe("my-db");
  });

  it("should skip provisioning for datasources with existing UIDs", async () => {
    const config: ProvisioningConfig = {
      datasources: [
        {name: "First", type: "mysql", uid: "shared-uid", config: {}},
      ],
    };
    await provisionDatasources(storage, config);

    const config2: ProvisioningConfig = {
      datasources: [
        {name: "Second", type: "clp", uid: "shared-uid", config: {}},
        {name: "New", type: "infinity", uid: "new-uid", config: {}},
      ],
    };
    await provisionDatasources(storage, config2);
    const list = await storage.list();
    expect(list).toHaveLength(2);
    expect(list.find((ds) => ds.uid === "shared-uid")?.name).toBe("First");
  });
});
