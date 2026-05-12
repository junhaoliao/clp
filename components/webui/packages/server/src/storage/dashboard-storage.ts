import type {Dashboard, DashboardSummary} from "@webui/common/dashboard/types";

interface DashboardRow {
  id: string;
  uid: string;
  title: string;
  description: string | null;
  tags: string;
  panels_json: string;
  variables_json: string;
  time_range_json: string;
  refresh_interval: string | null;
  version: number;
  updated_at: string;
  created_at: string;
}

function rowToDashboard(row: DashboardRow): Dashboard {
  return {
    id: row.id,
    uid: row.uid,
    title: row.title,
    ...(row.description !== null ? {description: row.description} : {}),
    tags: JSON.parse(row.tags) as string[],
    panels: JSON.parse(row.panels_json) as Dashboard["panels"],
    variables: JSON.parse(row.variables_json) as Dashboard["variables"],
    timeRange: JSON.parse(row.time_range_json) as Dashboard["timeRange"],
    ...(row.refresh_interval !== null ? {refreshInterval: row.refresh_interval} : {}),
    version: row.version,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function rowToSummary(row: DashboardRow): DashboardSummary {
  return {
    id: row.id,
    uid: row.uid,
    title: row.title,
    tags: JSON.parse(row.tags) as string[],
    updatedAt: row.updated_at,
  };
}

export interface DashboardStorage {
  list(): Promise<DashboardSummary[]>;
  get(uid: string): Promise<Dashboard | null>;
  create(dashboard: Dashboard): Promise<Dashboard>;
  update(uid: string, dashboard: Dashboard): Promise<Dashboard | null>;
  delete(uid: string): Promise<boolean>;
}

export class InMemoryDashboardStorage implements DashboardStorage {
  private store = new Map<string, Dashboard>();

  async list(): Promise<DashboardSummary[]> {
    return Array.from(this.store.values()).map((d) => ({
      id: d.id,
      uid: d.uid,
      title: d.title,
      tags: d.tags,
      updatedAt: d.updatedAt,
    }));
  }

  async get(uid: string): Promise<Dashboard | null> {
    return this.store.get(uid) ?? null;
  }

  async create(dashboard: Dashboard): Promise<Dashboard> {
    this.store.set(dashboard.uid, dashboard);
    return dashboard;
  }

  async update(uid: string, dashboard: Dashboard): Promise<Dashboard | null> {
    if (!this.store.has(uid)) return null;
    this.store.set(uid, dashboard);
    return dashboard;
  }

  async delete(uid: string): Promise<boolean> {
    return this.store.delete(uid);
  }
}

export class MySQLDashboardStorage implements DashboardStorage {
  private getConnection;

  constructor(getConnection: () => Promise<import("mysql2/promise").Connection>) {
    this.getConnection = getConnection;
  }

  async list(): Promise<DashboardSummary[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.query("SELECT id, uid, title, tags, updated_at, created_at FROM dashboards ORDER BY updated_at DESC");
      return (rows as DashboardRow[]).map(rowToSummary);
    } finally {
      await conn.end();
    }
  }

  async get(uid: string): Promise<Dashboard | null> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.query("SELECT * FROM dashboards WHERE uid = ?", [uid]);
      const row = (rows as DashboardRow[])[0];
      if (!row) return null;
      return rowToDashboard(row);
    } finally {
      await conn.end();
    }
  }

  async create(dashboard: Dashboard): Promise<Dashboard> {
    const conn = await this.getConnection();
    try {
      await conn.query(
        `INSERT INTO dashboards (id, uid, title, description, tags, panels_json, variables_json, time_range_json, refresh_interval, version, updated_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dashboard.id,
          dashboard.uid,
          dashboard.title,
          dashboard.description ?? null,
          JSON.stringify(dashboard.tags),
          JSON.stringify(dashboard.panels),
          JSON.stringify(dashboard.variables),
          JSON.stringify(dashboard.timeRange),
          dashboard.refreshInterval ?? null,
          dashboard.version,
          dashboard.updatedAt,
          dashboard.createdAt,
        ],
      );
      return dashboard;
    } finally {
      await conn.end();
    }
  }

  async update(uid: string, dashboard: Dashboard): Promise<Dashboard | null> {
    const conn = await this.getConnection();
    try {
      const [result] = await conn.query(
        `UPDATE dashboards SET title = ?, description = ?, tags = ?, panels_json = ?, variables_json = ?, time_range_json = ?, refresh_interval = ?, version = ?, updated_at = ?
         WHERE uid = ? AND version = ?`,
        [
          dashboard.title,
          dashboard.description ?? null,
          JSON.stringify(dashboard.tags),
          JSON.stringify(dashboard.panels),
          JSON.stringify(dashboard.variables),
          JSON.stringify(dashboard.timeRange),
          dashboard.refreshInterval ?? null,
          dashboard.version,
          dashboard.updatedAt,
          uid,
          dashboard.version - 1,
        ],
      );
      const affected = (result as {affectedRows: number}).affectedRows;
      if (affected === 0) return null;
      return dashboard;
    } finally {
      await conn.end();
    }
  }

  async delete(uid: string): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      const [result] = await conn.query("DELETE FROM dashboards WHERE uid = ?", [uid]);
      return (result as {affectedRows: number}).affectedRows > 0;
    } finally {
      await conn.end();
    }
  }
}

/** SQL to create the dashboards table */
export const DASHBOARD_MIGRATION = `
CREATE TABLE IF NOT EXISTS dashboards (
  id VARCHAR(21) NOT NULL,
  uid VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tags JSON NOT NULL,
  panels_json JSON NOT NULL,
  variables_json JSON NOT NULL,
  time_range_json JSON NOT NULL,
  refresh_interval VARCHAR(10),
  version INT NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_uid (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
