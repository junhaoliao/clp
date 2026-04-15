import {useQuery} from "@tanstack/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";


dayjs.extend(utc);
import {
    CLP_STORAGE_ENGINES,
    SqlTableSuffix,
} from "@clp/webui-shared";

import {DashboardCard} from "../../../components/dashboard/DashboardCard";
import {api} from "../../../lib/api-client";
import {settings} from "../../../settings";


/**
 * Details data returned from SQL query.
 */
interface DetailsData {
    begin_timestamp: number | null;
    end_timestamp: number | null;
    num_files: number | null;
    num_messages: number | null;
}

const DETAILS_EMPTY: DetailsData = {
    begin_timestamp: null,
    end_timestamp: null,
    num_files: 0,
    num_messages: 0,
};


const DATE_FORMAT = "MMMM D, YYYY";


/**
 * Fetches dataset names from the database.
 */
const fetchDatasetNames = async (): Promise<string[]> => {
    const res = await api.api["archive-metadata"].sql.$post({
        json: {queryString: `SELECT name FROM ${settings.SqlDbClpDatasetsTableName};`},
    });

    if (!res.ok as boolean) {
        return [];
    }

    const rows = await res.json() as Array<{name: string}>;

    return rows.map((r) => r.name);
};


/**
 * Builds the CLP-S details SQL query across multiple datasets.
 *
 * @param datasetNames
 * @param tablePrefix
 */
const buildClpsDetailsSql = (datasetNames: string[], tablePrefix: string): string => {
    if (0 === datasetNames.length) {
        return "";
    }

    const archiveQueries = datasetNames.map((name) => `
        SELECT
            MIN(begin_timestamp) AS begin_timestamp,
            MAX(end_timestamp) AS end_timestamp
        FROM ${tablePrefix}${name}_${SqlTableSuffix.ARCHIVES}
    `);

    const fileQueries = datasetNames.map((name) => `
        SELECT
            COUNT(DISTINCT orig_file_id) AS num_files,
            CAST(COALESCE(SUM(num_messages), 0) AS UNSIGNED) AS num_messages
        FROM ${tablePrefix}${name}_${SqlTableSuffix.FILES}
    `);

    return `
        SELECT
            a.begin_timestamp,
            a.end_timestamp,
            b.num_files,
            b.num_messages
        FROM
        (
            SELECT
                MIN(begin_timestamp) AS begin_timestamp,
                MAX(end_timestamp) AS end_timestamp
            FROM (
                ${archiveQueries.join("\nUNION ALL\n")}
            ) AS archives_combined
        ) a,
        (
            SELECT
                SUM(num_files) AS num_files,
                SUM(num_messages) AS num_messages
            FROM (
                ${fileQueries.join("\nUNION ALL\n")}
            ) AS files_combined
        ) b;
    `;
};


/**
 * Builds the CLP details SQL query (single table).
 */
const buildClpDetailsSql = (): string => {
    return `
        SELECT
            a.begin_timestamp,
            a.end_timestamp,
            b.num_files,
            b.num_messages
        FROM
        (
            SELECT
                MIN(begin_timestamp) AS begin_timestamp,
                MAX(end_timestamp) AS end_timestamp
            FROM ${settings.SqlDbClpArchivesTableName}
        ) a,
        (
            SELECT
                COUNT(DISTINCT orig_file_id) AS num_files,
                CAST(COALESCE(SUM(num_messages), 0) AS UNSIGNED) AS num_messages
            FROM ${settings.SqlDbClpFilesTableName}
        ) b;
    `;
};


/**
 * Shows archive metadata details: time range, message count, file count.
 */
const Details = () => {
    const isClpS = CLP_STORAGE_ENGINES.CLP_S === settings.ClpStorageEngine as CLP_STORAGE_ENGINES;

    // First fetch dataset names (CLP-S only)
    const {data: datasetNames = [], isSuccess: datasetsReady} = useQuery({
        queryKey: ["datasets"],
        queryFn: fetchDatasetNames,
        enabled: isClpS,
    });

    // Then fetch details
    const {data: details = DETAILS_EMPTY, isPending} = useQuery({
        queryKey: ["details",
            datasetNames],
        queryFn: async (): Promise<DetailsData> => {
            let sql: string;
            if (isClpS) {
                if (0 === datasetNames.length) {
                    return DETAILS_EMPTY;
                }

                sql = buildClpsDetailsSql(datasetNames, settings.SqlDbClpTablePrefix);
            } else {
                sql = buildClpDetailsSql();
            }

            const res = await api.api["archive-metadata"].sql.$post({
                json: {queryString: sql},
            });

            if (!res.ok as boolean) {
                return DETAILS_EMPTY;
            }

            const rows = (await res.json()) as unknown as DetailsData[];
            if (0 === rows.length) {
                return DETAILS_EMPTY;
            }

            return rows[0] ?? DETAILS_EMPTY;
        },
        enabled: !isClpS || datasetsReady,
        placeholderData: DETAILS_EMPTY,
    });

    const beginDate = dayjs.utc(details.begin_timestamp);
    const endDate = dayjs.utc(details.end_timestamp);
    const hasTimestampData = beginDate.isValid() && endDate.isValid();

    let timeRangeDisplay = "...";
    if (!isPending) {
        timeRangeDisplay = hasTimestampData ?
            `${beginDate.format(DATE_FORMAT)} — ${endDate.format(DATE_FORMAT)}` :
            "No timestamp data";
    }

    // CLP-S storage engine does not populate the files tables, so Messages and
    // Files stats are always 0.  Hide those cards to match the original webui.
    const showMessagesAndFiles = !isClpS;

    return (
        <div
            className={showMessagesAndFiles ?
                "grid grid-cols-1 sm:grid-cols-3 gap-4" :
                "grid grid-cols-1 gap-4"}
        >
            <DashboardCard title={"Time Range"}>
                <p className={"text-lg font-semibold"}>
                    {timeRangeDisplay}
                </p>
            </DashboardCard>
            {showMessagesAndFiles && (
                <>
                    <DashboardCard title={"Messages"}>
                        <p className={"text-lg font-semibold"}>
                            {isPending ?
                                "..." :
                                (details.num_messages ?? 0).toLocaleString()}
                        </p>
                    </DashboardCard>
                    <DashboardCard title={"Files"}>
                        <p className={"text-lg font-semibold"}>
                            {isPending ?
                                "..." :
                                (details.num_files ?? 0).toLocaleString()}
                        </p>
                    </DashboardCard>
                </>
            )}
        </div>
    );
};


export {Details};
