import type {
    DatasourceInstance,
    DatasourceType,
} from "@webui/common/dashboard/types";

import {toMySQLDatetime} from "./datetime-utils.js";


interface DatasourceRow {
    id: string;
    uid: string;
    name: string;
    type: DatasourceType;
    config_json: string;
    is_default: number;
    created_at: string;
    updated_at: string;
}

/**
 *
 * @param row
 */
function rowToDatasource (row: DatasourceRow): DatasourceInstance {
    return {
        id: row.id,
        uid: row.uid,
        name: row.name,
        type: row.type,
        config: JSON.parse(row.config_json) as Record<string, unknown>,
        isDefault: 1 === row.is_default,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export interface DatasourceStorage {
    list(): Promise<DatasourceInstance[]>;
    get(uid: string): Promise<DatasourceInstance | null>;
    create(datasource: DatasourceInstance): Promise<DatasourceInstance>;
    update(uid: string, updates: Partial<DatasourceInstance>): Promise<DatasourceInstance | null>;
    delete(uid: string): Promise<boolean>;
}

export class InMemoryDatasourceStorage implements DatasourceStorage {
    private store = new Map<string, DatasourceInstance>();

    async list (): Promise<DatasourceInstance[]> {
        return Array.from(this.store.values());
    }

    async get (uid: string): Promise<DatasourceInstance | null> {
        return this.store.get(uid) ?? null;
    }

    async create (datasource: DatasourceInstance): Promise<DatasourceInstance> {
        this.store.set(datasource.uid, datasource);

        return datasource;
    }

    async update (uid: string, updates: Partial<DatasourceInstance>): Promise<DatasourceInstance | null> {
        const existing = this.store.get(uid);
        if (!existing) {
            return null;
        }
        const updated: DatasourceInstance = {...existing, ...updates, uid, id: existing.id, type: existing.type, createdAt: existing.createdAt};
        this.store.set(uid, updated);

        return updated;
    }

    async delete (uid: string): Promise<boolean> {
        return this.store.delete(uid);
    }
}

export class MySQLDatasourceStorage implements DatasourceStorage {
    private getConnection;

    constructor (getConnection: () => Promise<import("mysql2/promise").Connection>) {
        this.getConnection = getConnection;
    }

    async list (): Promise<DatasourceInstance[]> {
        const conn = await this.getConnection();
        try {
            const [rows] = await conn.query("SELECT * FROM datasources ORDER BY created_at ASC");
            return (rows as DatasourceRow[]).map(rowToDatasource);
        } finally {
            await conn.end();
        }
    }

    async get (uid: string): Promise<DatasourceInstance | null> {
        const conn = await this.getConnection();
        try {
            const [rows] = await conn.query("SELECT * FROM datasources WHERE uid = ?", [uid]);
            const row = (rows as DatasourceRow[])[0];
            if (!row) {
                return null;
            }

            return rowToDatasource(row);
        } finally {
            await conn.end();
        }
    }

    async create (datasource: DatasourceInstance): Promise<DatasourceInstance> {
        const conn = await this.getConnection();
        try {
            await conn.query(
                `INSERT INTO datasources (id, uid, name, type, config_json, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    datasource.id,
                    datasource.uid,
                    datasource.name,
                    datasource.type,
                    JSON.stringify(datasource.config),
                    datasource.isDefault ?
                        1 :
                        0,
                    datasource.createdAt,
                    datasource.updatedAt,
                ],
            );

            return datasource;
        } finally {
            await conn.end();
        }
    }

    async delete (uid: string): Promise<boolean> {
        const conn = await this.getConnection();
        try {
            const [result] = await conn.query("DELETE FROM datasources WHERE uid = ?", [uid]);
            return 0 < (result as {affectedRows: number}).affectedRows;
        } finally {
            conn.destroy();
        }
    }

    async update (uid: string, updates: Partial<DatasourceInstance>): Promise<DatasourceInstance | null> {
        const existing = await this.get(uid);
        if (!existing) {
            return null;
        }
        const updated: DatasourceInstance = {...existing, ...updates, uid, id: existing.id, type: existing.type, createdAt: existing.createdAt, updatedAt: toMySQLDatetime()};
        const conn = await this.getConnection();
        try {
            await conn.query(
                "UPDATE datasources SET name = ?, config_json = ?, is_default = ?, updated_at = ? WHERE uid = ?",
                [updated.name,
                    JSON.stringify(updated.config),
                    updated.isDefault ?
                        1 :
                        0,
                    updated.updatedAt,
                    uid],
            );

            return updated;
        } finally {
            conn.destroy();
        }
    }
}

/** SQL to create the datasources table */
export const DATASOURCE_MIGRATION = `
CREATE TABLE IF NOT EXISTS datasources (
  id VARCHAR(21) NOT NULL,
  uid VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL,
  config_json JSON NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_uid (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
