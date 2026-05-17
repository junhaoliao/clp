import {useState} from "react";

import {useQuery} from "@tanstack/react-query";
import {
    CLP_QUERY_ENGINES,
    CLP_STORAGE_ENGINES,
} from "@webui/common/config";
import {type AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import {
    SETTINGS_QUERY_ENGINE,
    SETTINGS_STORAGE_ENGINE,
} from "../../config";
import ExploreTabs from "./ExploreTabs";
import styles from "./index.module.css";
import {ProgressBar} from "./ProgressBar";
import SearchControls from "./SearchControls";
import DatasetSelect from "./SearchControls/Dataset/DatasetSelect";
import SearchResultsTable from "./SearchResults/SearchResultsTable";
import SearchResultsTimeline from "./SearchResults/SearchResultsTimeline";
import {
    flattenFieldNames,
    toLogEvents,
} from "./searchResultUtils";
import useSearchStore from "./SearchState";
import usePrestoSearchState from "./SearchState/Presto";
import {PRESTO_SQL_INTERFACE} from "./SearchState/Presto/typings";
import {useUpdateStateWithMetadata} from "./SearchState/useUpdateStateWithMetadata";
import {useExperimentalSearchResults} from "./useExperimentalSearchResults";
import {useKqlQuery} from "./useKqlQuery";

import {FieldBrowser} from "@/features/clpp/components/field-browser";
import {LogsDataTable} from "@/features/clpp/components/logs-data-table";
import {PatternsDataTable} from "@/features/clpp/components/patterns-data-table";
import {QueryBar} from "@/features/clpp/components/query-bar";
import {QueryInterpretationPanel} from "@/features/clpp/components/query-interpretation-panel";
import {useClppSettingsStore} from "@/features/clpp/stores/clpp-settings-store";
import type {SchemaTreeResponse} from "@/features/clpp/types";


const api = hc<AppType>("/");

/**
 * Fetches the schema tree for a dataset and returns deduplicated
 * field options (built-in + schema tree fields).
 *
 * @param dataset
 * @return Field option strings.
 */
const useFieldOptions = (dataset: string): string[] => {
    const {data: treeData} = useQuery({
        enabled: 0 < dataset.length,
        queryFn: async () => {
            const res = await api.api["schema-tree"].$get({
                query: {dataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch schema tree");
            }

            return res.json() as Promise<SchemaTreeResponse>;
        },
        queryKey: ["schema-tree",
            dataset],
        refetchInterval: false,
    });

    const clppFieldOptions: string[] = treeData?.tree ?
        flattenFieldNames(treeData.tree) :
        [];

    return [
        ...new Set([
            "timestamp",
            "level",
            "service",
            ...clppFieldOptions,
        ]),
    ];
};

/**
 * Explore page with field browser, query bar, and tabbed results.
 *
 * @return JSX element
 */
const ExplorePage = () => {
    useUpdateStateWithMetadata();
    const sqlInterface = usePrestoSearchState(
        (state) => state.sqlInterface,
    );
    const selectedDatasets = useSearchStore(
        (state) => state.selectedDatasets,
    );
    const isExperimentalMode = useClppSettingsStore(
        (s) => s.experimentalMode,
    );
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const {
        addPatternFilter: handleAddPatternFilter,
        queryString: kqlQueryString,
        removePatternFilter: handleRemovePatternFilter,
        submitQuery: handleQuerySubmit,
    } = useKqlQuery();

    const dataset: string = selectedDatasets[0] ?? "";
    const fieldOptions = useFieldOptions(dataset);

    const toggleField = (name: string) => {
        setSelectedFields((prev) => {
            if (prev.includes(name)) {
                return prev.filter((f) => f !== name);
            }

            return [
                ...prev,
                name,
            ];
        });
    };

    // In experimental mode, SearchResultsVirtualTable is not mounted (ExploreTabs
    // renders LogsDataTable instead), so its useSearchResults/useCursor hooks
    // never run. This hook subscribes to Socket.IO results and syncs them to the
    // store only when experimental mode is active.
    useExperimentalSearchResults(isExperimentalMode);

    const searchResults = useSearchStore(
        (state) => state.searchResults,
    );
    const logEventData = toLogEvents(searchResults ?? []);

    const logsDataTable = isExperimentalMode ?
        (
            <LogsDataTable
                data={logEventData}
                selectedFields={selectedFields}/>
        ) :
        null;

    const patternsDataTable = isExperimentalMode ?
        (
            <PatternsDataTable
                dataset={dataset}
                onAddPatternFilter={handleAddPatternFilter}
                onRemovePatternFilter={handleRemovePatternFilter}/>
        ) :
        null;

    return (
        <>
            {SETTINGS_QUERY_ENGINE === CLP_QUERY_ENGINES.PRESTO && (
                <ProgressBar/>
            )}
            <div className={"flex h-full"}>
                {isExperimentalMode && (
                    <FieldBrowser
                        dataset={dataset}
                        selectedFields={selectedFields}
                        onToggleField={toggleField}/>
                )}
                <div className={"flex flex-1 flex-col min-h-0"}>
                    {isExperimentalMode && (
                        <div className={"flex items-center gap-2 px-3 py-2"}>
                            {CLP_STORAGE_ENGINES.CLP_S ===
                              SETTINGS_STORAGE_ENGINE && (
                                <div className={"flex items-center gap-1.5 shrink-0"}>
                                    <span className={"text-xs font-medium text-muted-foreground"}>
                                        Dataset
                                    </span>
                                    <DatasetSelect isMultiSelect={false}/>
                                </div>
                            )}
                            <div className={"flex-1"}>
                                <QueryBar
                                    dataset={dataset}
                                    externalValue={kqlQueryString}
                                    fieldNames={fieldOptions}
                                    onQuerySubmit={handleQuerySubmit}/>
                            </div>
                        </div>
                    )}
                    {isExperimentalMode && (
                        <QueryInterpretationPanel query={kqlQueryString}/>
                    )}
                    <ExploreTabs
                        dataset={dataset}
                        isExperimentalMode={isExperimentalMode}
                        logsDataTable={logsDataTable}
                        patternsDataTable={patternsDataTable}
                    >
                        <div className={styles["searchPageContainer"]}>
                            <SearchControls/>
                            {(SETTINGS_QUERY_ENGINE !==
                              CLP_QUERY_ENGINES.PRESTO ||
                              PRESTO_SQL_INTERFACE.GUIDED ===
                              sqlInterface) &&
                              <SearchResultsTimeline/>}
                            <SearchResultsTable/>
                        </div>
                    </ExploreTabs>
                </div>
            </div>
        </>
    );
};

export default ExplorePage;
