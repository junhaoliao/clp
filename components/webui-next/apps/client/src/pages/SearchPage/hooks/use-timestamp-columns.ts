import {useQuery} from "@tanstack/react-query";


/**
 * Fetches timestamp-type column names from the column_metadata table
 * for a given dataset.
 *
 * @param dataset
 */
const useTimestampColumns = (dataset: string | null) => {
    return useQuery({
        queryKey: ["timestamp-columns",
            dataset],
        queryFn: async (): Promise<string[]> => {
            if (!dataset) {
                return [];
            }

            const sql =
                `SELECT name FROM clp_${dataset}_column_metadata ` +
                "WHERE type = 'timestamp' ORDER BY name;";

            const res = await fetch("/api/archive-metadata/sql", {
                body: JSON.stringify({queryString: sql}),
                headers: {"Content-Type": "application/json"},
                method: "POST",
            });

            if (!res.ok) {
                return [];
            }

            const rows = await res.json() as Array<{name: string}>;
            return rows.map((r) => r.name);
        },
        enabled: null !== dataset && 0 < dataset.length,
    });
};


export {useTimestampColumns};
