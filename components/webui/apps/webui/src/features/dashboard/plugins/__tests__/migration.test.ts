import {describe, it, expect} from "vitest";
import {migratePanel, migratePanels, setLatestSchemaVersion, getLatestSchemaVersion} from "../migration";
import type {DashboardPanel} from "@webui/common/dashboard/types";

describe("Panel schema migration", () => {
  it("should return panel unchanged if no migration handler", () => {
    const panel: DashboardPanel = {
      id: "p1",
      type: "timeseries",
      title: "Test",
      gridPos: {x: 0, y: 0, w: 6, h: 4},
      datasource: {type: "mysql", uid: "ds1"},
      queries: [],
      options: {oldFormat: true},
      schemaVersion: 1,
    };

    const result = migratePanel(panel);
    expect(result.options).toEqual({oldFormat: true});
    expect(result.schemaVersion).toBe(1);
  });

  it("should return panel unchanged if already at latest version", () => {
    setLatestSchemaVersion("stat", 2);
    const panel: DashboardPanel = {
      id: "p1",
      type: "stat",
      title: "Test",
      gridPos: {x: 0, y: 0, w: 6, h: 4},
      datasource: {type: "mysql", uid: "ds1"},
      queries: [],
      options: {format: "v2"},
      schemaVersion: 2,
    };

    const result = migratePanel(panel);
    expect(result.options).toEqual({format: "v2"});
    expect(result.schemaVersion).toBe(2);
  });

  it("should default schemaVersion to 1 if missing", () => {
    setLatestSchemaVersion("stat", 1);
    const panel: DashboardPanel = {
      id: "p1",
      type: "stat",
      title: "Test",
      gridPos: {x: 0, y: 0, w: 6, h: 4},
      datasource: {type: "mysql", uid: "ds1"},
      queries: [],
      options: {},
    };

    const result = migratePanel(panel);
    expect(result.schemaVersion).toBeUndefined();
  });

  it("should get and set latest schema version", () => {
    setLatestSchemaVersion("custom", 3);
    expect(getLatestSchemaVersion("custom")).toBe(3);
    expect(getLatestSchemaVersion("unknown")).toBe(1);
  });

  it("should migrate all panels in an array", () => {
    const panels: DashboardPanel[] = [
      {id: "p1", type: "timeseries", title: "A", gridPos: {x: 0, y: 0, w: 6, h: 4}, datasource: {type: "mysql", uid: "ds1"}, queries: [], options: {}, schemaVersion: 1},
      {id: "p2", type: "stat", title: "B", gridPos: {x: 6, y: 0, w: 6, h: 4}, datasource: {type: "mysql", uid: "ds1"}, queries: [], options: {}},
    ];

    const result = migratePanels(panels);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("p1");
    expect(result[1]!.id).toBe("p2");
  });
});
