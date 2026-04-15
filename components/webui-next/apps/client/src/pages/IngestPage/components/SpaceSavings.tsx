import {CLP_STORAGE_ENGINES} from "@clp/webui-shared";

import {
    useArchiveStats,
    useDatasets,
} from "../../../api";
import {DashboardCard} from "../../../components/dashboard/DashboardCard";
import {SETTINGS_STORAGE_ENGINE} from "../../../config";
import {formatSizeInBytes} from "../../../lib/format";
import {settings} from "../../../settings";


interface SpaceSavingsData {
    total_uncompressed_size: number;
    total_compressed_size: number;
}


/**
 *
 * @param uncompressedSize
 * @param compressedSize
 */
const computeSpaceSavingsPercent = (
    uncompressedSize: number,
    compressedSize: number,
): string => {
    if (0 === uncompressedSize) {
        return "0.00%";
    }

    const savings = 100 * (1 - (compressedSize / uncompressedSize));

    return `${savings.toFixed(2)}%`;
};


/**
 * Build the space savings SQL query for CLP engine (single dataset).
 */
const buildClpSpaceSavingsSql = (): string => {
    return "SELECT " +
        "CAST(COALESCE(SUM(uncompressed_size), 0) AS UNSIGNED) AS total_uncompressed_size, " +
        "CAST(COALESCE(SUM(size), 0) AS UNSIGNED) AS total_compressed_size " +
        `FROM ${settings.SqlDbClpArchivesTableName};`;
};


/**
 * Build the space savings SQL query for CLP-S engine (multiple datasets).
 * Uses UNION ALL across per-dataset archive tables.
 *
 * @param datasetNames
 */
const buildClpsSpaceSavingsSql = (datasetNames: string[]): string => {
    if (0 === datasetNames.length) {
        return "";
    }

    const prefix = settings.SqlDbClpTablePrefix;
    const archiveQueries = datasetNames.map((name) => `SELECT uncompressed_size, size FROM ${prefix}${name}_archives`);

    return "SELECT " +
        "CAST(COALESCE(SUM(uncompressed_size), 0) AS UNSIGNED) AS total_uncompressed_size, " +
        "CAST(COALESCE(SUM(size), 0) AS UNSIGNED) AS total_compressed_size " +
        `FROM (${archiveQueries.join(" UNION ALL ")}) AS archives_combined;`;
};


/**
 * Displays space savings statistics (savings %, uncompressed size, compressed size).
 * Handles both CLP (single table) and CLP-S (per-dataset tables).
 */
const SpaceSavings = () => {
    const isClp = CLP_STORAGE_ENGINES.CLP === SETTINGS_STORAGE_ENGINE;

    // For CLP-S, we first need to fetch datasets to know which tables to query
    const datasetsQuery = useDatasets();
    const datasetNames = datasetsQuery.data ?? [];

    // Build the appropriate SQL query
    const sqlQuery = isClp ?
        buildClpSpaceSavingsSql() :
        buildClpsSpaceSavingsSql(datasetNames);

    const statsQuery = useArchiveStats(sqlQuery);
    const rows = statsQuery.data as SpaceSavingsData[] | undefined;
    const data = rows?.[0];
    const uncompressedSize = data?.total_uncompressed_size ?? 0;
    const compressedSize = data?.total_compressed_size ?? 0;

    return (
        <div className={"grid grid-cols-2 gap-4"}>
            <DashboardCard
                backgroundColor={"oklch(0.55 0.18 250)"}
                className={"col-span-2"}
                title={"Space Savings"}
                titleColor={"oklch(1 0 0)"}
            >
                <p className={"text-[5.5rem] font-bold text-white leading-tight"}>
                    {computeSpaceSavingsPercent(uncompressedSize, compressedSize)}
                </p>
            </DashboardCard>
            <DashboardCard title={"Uncompressed"}>
                <p className={"text-2xl font-semibold"}>
                    {formatSizeInBytes(uncompressedSize)}
                </p>
            </DashboardCard>
            <DashboardCard title={"Compressed"}>
                <p className={"text-2xl font-semibold"}>
                    {formatSizeInBytes(compressedSize)}
                </p>
            </DashboardCard>
        </div>
    );
};


export {
    computeSpaceSavingsPercent, SpaceSavings,
};
