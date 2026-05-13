import type {DashboardPanel} from "@webui/common/dashboard/types";

import {getPanelPlugin} from "./registry";


/** Current schema version for each panel type */
const LATEST_SCHEMA_VERSIONS: Partial<Record<string, number>> = {};

/**
 * Set the latest schema version for a panel type (called during plugin registration)
 *
 * @param panelType
 * @param version
 */
export function setLatestSchemaVersion (panelType: string, version: number): void {
    LATEST_SCHEMA_VERSIONS[panelType] = version;
}

/**
 * Get the latest schema version for a panel type
 *
 * @param panelType
 */
export function getLatestSchemaVersion (panelType: string): number {
    return LATEST_SCHEMA_VERSIONS[panelType] ?? 1;
}

/**
 * Migrate a panel's options from its current schema version to the latest.
 * Returns the panel with updated options and schemaVersion if migration occurred.
 *
 * @param panel
 */
export function migratePanel (panel: DashboardPanel): DashboardPanel {
    const plugin = getPanelPlugin(panel.type);
    if (!plugin?.migrationHandler) {
        return panel;
    }

    const currentVersion = panel.schemaVersion ?? 1;
    const latestVersion = getLatestSchemaVersion(panel.type);

    if (currentVersion >= latestVersion) {
        return panel;
    }

    let {options} = panel;
    let version = currentVersion;

    for (let v = currentVersion; v < latestVersion; v++) {
        options = plugin.migrationHandler(v, options) as Record<string, unknown>;
        version = v + 1;
    }

    return {...panel, options, schemaVersion: version};
}

/**
 * Migrate all panels in a dashboard's panel array
 *
 * @param panels
 */
export function migratePanels (panels: DashboardPanel[]): DashboardPanel[] {
    return panels.map(migratePanel);
}
