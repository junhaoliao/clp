import {useQuery} from "@tanstack/react-query";

import {formatSizeInBytes} from "../../../lib/format";
import {settings} from "../../../settings";
import useSearchStore, {SEARCH_UI_STATE} from "../../../stores/search-store";


/**
 * Builds a SQL query to retrieve query speed (bytes processed / duration).
 *
 * @param datasetNames
 * @param jobId
 */
const buildQuerySpeedSql = (datasetNames: string[], jobId: string): string => {
    const tablePrefix = settings.SqlDbClpTablePrefix;

    let archivesSubquery: string;
    if (0 === datasetNames.length) {
        archivesSubquery = `SELECT id, uncompressed_size FROM ${settings.SqlDbClpArchivesTableName}`;
    } else if (1 === datasetNames.length) {
        archivesSubquery =
            `SELECT id, uncompressed_size FROM ${tablePrefix}${datasetNames[0]}_archives`;
    } else {
        archivesSubquery = datasetNames
            .map((name) => `SELECT id, uncompressed_size FROM ${tablePrefix}${name}_archives`)
            .join(" UNION ALL ");
    }

    return `WITH qt AS (
    SELECT job_id, archive_id
    FROM query_tasks
    WHERE archive_id IS NOT NULL AND job_id = ${jobId}
), totals AS (
    SELECT qt.job_id, SUM(ca.uncompressed_size) AS total_uncompressed_bytes
    FROM qt JOIN (${archivesSubquery}) ca ON qt.archive_id = ca.id
)
SELECT
    CAST(totals.total_uncompressed_bytes AS double) AS bytes,
    qj.duration AS duration
FROM query_jobs qj JOIN totals ON totals.job_id = qj.id`;
};

interface QuerySpeedData {
    bytes: number | null;
    duration: number | null;
}

interface QuerySpeedResult {
    speedText: string;
}

/**
 * Hook that fetches query speed after a search completes (DONE state).
 * Returns formatted speed text like "in 2.123 seconds (150 MB/s)".
 */
const useQuerySpeed = (): QuerySpeedResult => {
    const searchJobId = useSearchStore((s) => s.searchJobId);
    const searchUiState = useSearchStore((s) => s.searchUiState);
    const queriedDatasets = useSearchStore((s) => s.queriedDatasets);

    const {data} = useQuery({
        queryKey: ["query-speed",
            searchJobId,
            queriedDatasets],
        queryFn: async (): Promise<QuerySpeedData> => {
            if (null === searchJobId) {
                return {bytes: null, duration: null};
            }

            const sql = buildQuerySpeedSql(queriedDatasets, searchJobId);
            const res = await fetch("/api/archive-metadata/sql", {
                body: JSON.stringify({queryString: sql}),
                headers: {"Content-Type": "application/json"},
                method: "POST",
            });

            if (!res.ok) {
                return {bytes: null, duration: null};
            }

            const rows = await res.json() as QuerySpeedData[];
            if (0 === rows.length) {
                return {bytes: null, duration: null};
            }

            const [firstRow] = rows;
            if (!firstRow) {
                return {bytes: null, duration: null};
            }

            return firstRow;
        },
        enabled: SEARCH_UI_STATE.DONE === searchUiState && null !== searchJobId,
    });

    if (!data || null === data.bytes || null === data.duration || 0 === data.duration) {
        return {speedText: ""};
    }

    const latency = data.duration;
    const speed = data.bytes / data.duration;

    return {speedText: ` in ${latency.toFixed(3)} seconds (${formatSizeInBytes(speed)}/s)`};
};


export {useQuerySpeed};
