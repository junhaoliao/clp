import type {DatasourceInstance, DatasourceType} from "@webui/common/dashboard/types";
import type {DatasourceStorage} from "./datasource-storage.js";
import {toMySQLDatetime} from "./datetime-utils.js";
import {nanoid} from "nanoid";

export interface ProvisionedDatasource {
  name: string;
  type: DatasourceType;
  uid?: string;
  isDefault?: boolean;
  config: Record<string, unknown>;
}

interface ProvisioningConfig {
  datasources: ProvisionedDatasource[];
}

function getDefaultProvisioningConfig(): ProvisioningConfig {
  return {
    datasources: [
      {
        name: "CLP MySQL",
        type: "mysql",
        uid: "clp-mysql",
        isDefault: true,
        config: {
          host: process.env["MYSQL_HOST"] ?? "localhost",
          port: parseInt(process.env["MYSQL_PORT"] ?? "3306", 10),
          user: process.env["MYSQL_USER"] ?? "clp",
          password: process.env["MYSQL_PASSWORD"] ?? "",
          database: process.env["MYSQL_DATABASE"] ?? "clp",
        },
      },
      {
        name: "CLP Query",
        type: "clp",
        uid: "clp-query",
        isDefault: false,
        config: {},
      },
      {
        name: "Infinity (HTTP)",
        type: "infinity",
        uid: "infinity",
        isDefault: false,
        config: {allowedHosts: ""},
      },
    ],
  };
}

export async function provisionDatasources(
  storage: DatasourceStorage,
  config?: ProvisioningConfig,
): Promise<void> {
  const provisioning = config ?? getDefaultProvisioningConfig();
  const existing = await storage.list();
  const existingUids = new Set(existing.map((ds) => ds.uid));

  for (const ds of provisioning.datasources) {
    if (existingUids.has(ds.uid ?? "")) continue;

    const now = toMySQLDatetime();
    const instance: DatasourceInstance = {
      id: nanoid(21),
      uid: ds.uid ?? nanoid(10),
      name: ds.name,
      type: ds.type,
      config: ds.config,
      isDefault: ds.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await storage.create(instance);
  }
}

export type {ProvisioningConfig};
