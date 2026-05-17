import {useQuery} from "@tanstack/react-query";
import {CLP_STORAGE_ENGINES} from "@webui/common/config";
import type {AppType} from "@webui/server/hono-app";
import dayjs from "dayjs";
import {hc} from "hono/client";

import {SETTINGS_STORAGE_ENGINE} from "../../../config";
import {fetchDatasetNames} from "../../SearchPage/SearchControls/Dataset/sql";
import Files from "./Files";
import styles from "./index.module.css";
import Logtypes from "./Logtypes";
import Messages from "./Messages";
import Schema from "./Schema";
import SharedNodes from "./SharedNodes";
import {
    DETAILS_DEFAULT,
    fetchClpDetails,
    fetchClpsDetails,
} from "./sql";
import TimeRange from "./TimeRange";

import {useClppSettingsStore} from "@/features/clpp/stores/clpp-settings-store";
import type {SchemaTreeNode} from "@/features/clpp/types";

import {countSharedNodes} from "./shared-node-count";


const api = hc<AppType>("/");


/**
 * Renders grid with compression details.
 *
 * @return
 */
const Details = () => {
    const isExperimentalMode = useClppSettingsStore(
        (s) => s.experimentalMode,
    );
    const {data: datasetNames = [], isSuccess: isSuccessDatasetNames} = useQuery({
        queryKey: ["datasets"],
        queryFn: fetchDatasetNames,
        enabled: CLP_STORAGE_ENGINES.CLP_S === SETTINGS_STORAGE_ENGINE,
    });

    const {data: details = DETAILS_DEFAULT, isPending} = useQuery({
        queryKey: [
            "details",
            datasetNames,
        ],
        queryFn: async () => {
            if (CLP_STORAGE_ENGINES.CLP === SETTINGS_STORAGE_ENGINE) {
                return fetchClpDetails();
            }

            return fetchClpsDetails(datasetNames);
        },
        enabled: CLP_STORAGE_ENGINES.CLP === SETTINGS_STORAGE_ENGINE || isSuccessDatasetNames,
    });

    // Query CLPP logtype stats for the first dataset as representative
    const firstDataset: string = datasetNames[0] ?? "";
    const {data: logtypeStatsData, isPending: isLogtypeStatsPending} = useQuery({
        enabled: isExperimentalMode && 0 < firstDataset.length,
        queryFn: async () => {
            const res = await api.api["logtype-stats"].$get({
                query: {dataset: firstDataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch logtype stats");
            }

            return res.json();
        },
        queryKey: ["logtype-stats-details",
            firstDataset],
        refetchInterval: false,
    });

    // Query schema tree for the first dataset
    const {data: schemaTreeData, isPending: isSchemaTreePending} = useQuery({
        enabled: isExperimentalMode && 0 < firstDataset.length,
        queryFn: async () => {
            const res = await api.api["schema-tree"].$get({
                query: {dataset: firstDataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch schema tree");
            }

            return res.json();
        },
        queryKey: ["schema-tree-details",
            firstDataset],
        refetchInterval: false,
    });

    const numLogtypes = logtypeStatsData?.logtypes?.length ?? null;
    const hasSchema = schemaTreeData?.tree ?
        0 < schemaTreeData.tree.children.length :
        false;
    const numSharedNodes = schemaTreeData?.tree ?
        countSharedNodes(schemaTreeData.tree as SchemaTreeNode) :
        null;

    const isClppLoading = isLogtypeStatsPending || isSchemaTreePending;

    if (CLP_STORAGE_ENGINES.CLP === SETTINGS_STORAGE_ENGINE) {
        return (
            <div className={styles["detailsGrid"]}>
                <div className={styles["timeRange"]}>
                    <TimeRange
                        beginDate={dayjs.utc(details.begin_timestamp)}
                        endDate={dayjs.utc(details.end_timestamp)}
                        isLoading={isPending}/>
                </div>
                <Messages
                    isLoading={isPending}
                    numMessages={details.num_messages}/>
                <Files
                    isLoading={isPending}
                    numFiles={details.num_files}/>
            </div>
        );
    }

    return (
        <div>
            <TimeRange
                beginDate={dayjs.utc(details.begin_timestamp)}
                endDate={dayjs.utc(details.end_timestamp)}
                isLoading={isPending}/>
            {isExperimentalMode && (
                <div className={styles["detailsGrid"]}>
                    <Logtypes
                        isLoading={isClppLoading}
                        numLogtypes={numLogtypes}/>
                    <Schema
                        hasSchema={hasSchema}
                        isLoading={isClppLoading}/>
                    <SharedNodes
                        isLoading={isClppLoading}
                        numSharedNodes={numSharedNodes}/>
                </div>
            )}
        </div>
    );
};

export default Details;
