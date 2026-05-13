import {CLP_STORAGE_ENGINES, SqlTableSuffix} from "@webui/common/config";
import type {DashboardPanel} from "@webui/common/dashboard/types";

import {settings} from "../../settings";
import {
    CLP_ARCHIVES_TABLE_COLUMN_NAMES,
    CLP_FILES_TABLE_COLUMN_NAMES,
} from "../IngestPage/sqlConfig";


const DS_REF = {type: "mysql" as const, uid: "default"};

function buildArchivesFrom(datasetNames: string[]): string {
    if (0 === datasetNames.length) {
        return `(SELECT NULL AS ${CLP_ARCHIVES_TABLE_COLUMN_NAMES.UNCOMPRESSED_SIZE}, `
            + `NULL AS ${CLP_ARCHIVES_TABLE_COLUMN_NAMES.SIZE}, `
            + `NULL AS ${CLP_ARCHIVES_TABLE_COLUMN_NAMES.BEGIN_TIMESTAMP}, `
            + `NULL AS ${CLP_ARCHIVES_TABLE_COLUMN_NAMES.END_TIMESTAMP} LIMIT 0) AS t`;
    }

    const parts = datasetNames.map((name) =>
        `SELECT ${CLP_ARCHIVES_TABLE_COLUMN_NAMES.UNCOMPRESSED_SIZE}, `
        + `${CLP_ARCHIVES_TABLE_COLUMN_NAMES.SIZE}, `
        + `${CLP_ARCHIVES_TABLE_COLUMN_NAMES.BEGIN_TIMESTAMP}, `
        + `${CLP_ARCHIVES_TABLE_COLUMN_NAMES.END_TIMESTAMP} `
        + `FROM ${settings.SqlDbClpTablePrefix}${name}_${SqlTableSuffix.ARCHIVES}`);

    return `(${parts.join("\nUNION ALL\n")}) AS t`;
}

function buildFilesFrom(datasetNames: string[]): string {
    if (0 === datasetNames.length) {
        return `(SELECT NULL AS ${CLP_FILES_TABLE_COLUMN_NAMES.ORIG_FILE_ID}, `
            + `NULL AS ${CLP_FILES_TABLE_COLUMN_NAMES.NUM_MESSAGES} LIMIT 0) AS t`;
    }

    const parts = datasetNames.map((name) =>
        `SELECT ${CLP_FILES_TABLE_COLUMN_NAMES.ORIG_FILE_ID}, `
        + `${CLP_FILES_TABLE_COLUMN_NAMES.NUM_MESSAGES} `
        + `FROM ${settings.SqlDbClpTablePrefix}${name}_${SqlTableSuffix.FILES}`);

    return `(${parts.join("\nUNION ALL\n")}) AS t`;
}

function panel(id: string, title: string, x: number, y: number, w: number, h: number,
    sql: string, options: Record<string, unknown>): DashboardPanel {
    return {
        id,
        type: "stat",
        title,
        gridPos: {x, y, w, h},
        datasource: DS_REF,
        queries: [{refId: "A", datasource: DS_REF, query: sql}],
        options,
    };
}

/**
 * Builds the dashboard panels for the Ingest overview.
 *
 * @param storageEngine
 * @param datasetNames Only used when storageEngine is CLP_S.
 * @return
 */
export function buildIngestDashboardPanels(
    storageEngine: CLP_STORAGE_ENGINES,
    datasetNames: string[],
): DashboardPanel[] {
    const isClpS = CLP_STORAGE_ENGINES.CLP_S === storageEngine;
    const archivesFrom = isClpS
        ? buildArchivesFrom(datasetNames)
        : settings.SqlDbClpArchivesTableName;
    const filesFrom = isClpS
        ? buildFilesFrom(datasetNames)
        : settings.SqlDbClpFilesTableName;

    return [
        // Row 1: Space Savings stats
        panel(
            "space-savings",
            "Space Savings",
            0, 0, 4, 2,
            `SELECT CAST(ROUND(COALESCE(100 * (1 - `
                + `SUM(${CLP_ARCHIVES_TABLE_COLUMN_NAMES.SIZE}) `
                + `/ NULLIF(SUM(${CLP_ARCHIVES_TABLE_COLUMN_NAMES.UNCOMPRESSED_SIZE}), 0)), 0), 2) `
                + `AS DECIMAL(10,2)) AS value FROM ${archivesFrom}`,
            {suffix: "%", decimals: 2, trendIndicator: false, sparkline: false, color: "hsl(var(--primary))"},
        ),
        panel(
            "uncompressed-size",
            "Uncompressed Size",
            4, 0, 4, 2,
            `SELECT CAST(COALESCE(SUM(${CLP_ARCHIVES_TABLE_COLUMN_NAMES.UNCOMPRESSED_SIZE}), 0) AS UNSIGNED) AS value `
                + `FROM ${archivesFrom}`,
            {unit: "bytes", trendIndicator: false, sparkline: false},
        ),
        panel(
            "compressed-size",
            "Compressed Size",
            8, 0, 4, 2,
            `SELECT CAST(COALESCE(SUM(${CLP_ARCHIVES_TABLE_COLUMN_NAMES.SIZE}), 0) AS UNSIGNED) AS value `
                + `FROM ${archivesFrom}`,
            {unit: "bytes", trendIndicator: false, sparkline: false},
        ),

        // Row 2: Details stats
        panel(
            "time-range",
            "Time Range",
            0, 2, 4, 2,
            `SELECT CONCAT(`
                + `COALESCE(DATE_FORMAT(FROM_UNIXTIME(MIN(${CLP_ARCHIVES_TABLE_COLUMN_NAMES.BEGIN_TIMESTAMP}) / 1000), '%b %e, %Y'), 'N/A'), `
                + `' — ', `
                + `COALESCE(DATE_FORMAT(FROM_UNIXTIME(MAX(${CLP_ARCHIVES_TABLE_COLUMN_NAMES.END_TIMESTAMP}) / 1000), '%b %e, %Y'), 'N/A') `
                + `) AS value FROM ${archivesFrom}`,
            {trendIndicator: false, sparkline: false, decimals: 0},
        ),
        panel(
            "messages",
            "Messages",
            4, 2, 4, 2,
            `SELECT CAST(COALESCE(SUM(${CLP_FILES_TABLE_COLUMN_NAMES.NUM_MESSAGES}), 0) AS UNSIGNED) AS value `
                + `FROM ${filesFrom}`,
            {trendIndicator: false, sparkline: false, decimals: 0},
        ),
        panel(
            "files",
            "Files",
            8, 2, 4, 2,
            `SELECT COUNT(DISTINCT ${CLP_FILES_TABLE_COLUMN_NAMES.ORIG_FILE_ID}) AS value `
                + `FROM ${filesFrom}`,
            {trendIndicator: false, sparkline: false, decimals: 0},
        ),
    ];
}
