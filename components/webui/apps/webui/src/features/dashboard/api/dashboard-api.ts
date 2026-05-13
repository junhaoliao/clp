import {hcWithType} from "../api/rpc-client";
import type {Dashboard, DashboardSummary} from "@webui/common/dashboard/types";

const client = hcWithType();

export async function listDashboards(): Promise<DashboardSummary[]> {
  const res = await client.api.dashboards.$get();
  if (!res.ok) throw new Error(`Failed to list dashboards: ${res.status}`);
  return res.json() as Promise<DashboardSummary[]>;
}

export async function getDashboard(uid: string): Promise<Dashboard> {
  const res = await client.api.dashboards[":uid"].$get({param: {uid}});
  if (!res.ok) throw new Error(`Failed to get dashboard: ${res.status}`);
  return res.json() as Promise<Dashboard>;
}

export async function createDashboard(data: {title: string; description?: string; tags?: string[]}): Promise<Dashboard> {
  const res = await client.api.dashboards.$post({json: data});
  if (!res.ok) throw new Error(`Failed to create dashboard: ${res.status}`);
  return res.json() as Promise<Dashboard>;
}

export async function updateDashboard(uid: string, data: {version: number; [key: string]: unknown}): Promise<Dashboard> {
  const res = await client.api.dashboards[":uid"].$put({
    param: {uid},
    json: data,
  });
  if (!res.ok) throw new Error(`Failed to update dashboard: ${res.status}`);
  return res.json() as Promise<Dashboard>;
}

export async function deleteDashboard(uid: string): Promise<void> {
  const res = await client.api.dashboards[":uid"].$delete({param: {uid}});
  if (!res.ok) throw new Error(`Failed to delete dashboard: ${res.status}`);
}
