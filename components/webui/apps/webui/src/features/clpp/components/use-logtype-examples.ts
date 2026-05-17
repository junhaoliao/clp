import {useQuery} from "@tanstack/react-query";
import {type AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import {
    logtypeCompositeKey,
    type LogtypeEntry,
    type LogtypeExample,
} from "@/features/clpp/types";


const api = hc<AppType>("/");
const EXAMPLES_COUNT = 3;

/**
 * Hook to fetch logtype examples for each expanded logtype entry.
 *
 * Uses composite keys (`archive_id:id`) to avoid collisions when
 * the same numeric logtype ID appears in different archives.
 *
 * @param dataset
 * @param expandedEntries
 * @return Map of composite key to its example log events.
 */
const useLogtypeExamples = (
    dataset: string,
    expandedEntries: LogtypeEntry[],
): Map<string, LogtypeExample[]> => {
    const keys = expandedEntries.map((e) => logtypeCompositeKey(e));
    const {data} = useQuery({
        enabled: 0 < expandedEntries.length && 0 < dataset.length,
        queryFn: async () => {
            const results = await Promise.all(
                expandedEntries.map(async (entry) => {
                    const res = await api.api["logtype-examples"].$get({
                        query: {
                            archive_id: entry.archive_id,
                            count: EXAMPLES_COUNT,
                            dataset: dataset,
                            logtype_id: entry.id.toString(),
                            logtype_template: entry.log_type,
                        },
                    });

                    if (!res.ok) {
                        throw new Error(
                            `Failed to fetch examples for logtype ${entry.id}`,
                        );
                    }

                    const json = await res.json() as {
                        archive_id: string;
                        examples: LogtypeExample[];
                        logtype_id: number;
                    };

                    return {
                        archive_id: json.archive_id,
                        examples: json.examples,
                        logtype_id: json.logtype_id,
                    };
                }),
            );

            return new Map<string, LogtypeExample[]>(
                results.map((r) => [
                    logtypeCompositeKey({
                        archive_id: r.archive_id,
                        id: r.logtype_id,
                    }),
                    r.examples,
                ]),
            );
        },
        queryKey: ["logtype-examples",
            dataset,
            keys.sort().join(",")],
        refetchInterval: false,
    });

    return data ?? new Map<string, LogtypeExample[]>();
};


export {useLogtypeExamples};
