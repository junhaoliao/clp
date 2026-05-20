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
import {ProgressBar} from "./ProgressBar";
import DatasetSelect from "./SearchControls/Dataset/DatasetSelect";
import SearchResultsTimeline from "./SearchResults/SearchResultsTimeline";
import TimeRangeInput from "./SearchControls/TimeRangeInput";
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
import {ResizableSidebar} from "@/features/dashboard/components/resizable-sidebar";
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
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const {
        addPatternFilter: handleAddPatternFilter,
        queryString: kqlQueryString,
        removePatternFilter: handleRemovePatternFilter,
        submitQuery: handleQuerySubmit,
    } = useKqlQuery(selectedFields);

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

    useExperimentalSearchResults(true);

    const searchResults = useSearchStore(
        (state) => state.searchResults,
    );
    const logEventData = toLogEvents(searchResults ?? []);

    return (
        <>
            {SETTINGS_QUERY_ENGINE === CLP_QUERY_ENGINES.PRESTO && (
                <ProgressBar/>
            )}
            <div className={"flex flex-1 min-h-0"}>
                <ResizableSidebar side="left">
                    <FieldBrowser
                        dataset={dataset}
                        selectedFields={selectedFields}
                        onToggleField={toggleField}/>
                </ResizableSidebar>
                <div className={"flex flex-1 flex-col min-h-0"}>
                    <div className={"flex flex-wrap items-center gap-2 px-3 py-2"}>
                        {CLP_STORAGE_ENGINES.CLP_S ===
                          SETTINGS_STORAGE_ENGINE && (
                            <div className={"flex items-center gap-1.5 shrink-0"}>
                                <span className={"text-xs font-medium text-muted-foreground"}>
                                    Dataset
                                </span>
                                <DatasetSelect isMultiSelect={false}/>
                            </div>
                        )}
                        <div className={"shrink-0"}>
                            <TimeRangeInput/>
                        </div>
                        <div className={"min-w-80 flex-1"}>
                            <QueryBar
                                dataset={dataset}
                                externalValue={kqlQueryString}
                                fieldNames={fieldOptions}
                                onQuerySubmit={handleQuerySubmit}/>
                        </div>
                    </div>
                    <ExploreTabs
                        dataset={dataset}
                        logsDataTable={
                            <div className={"flex h-full min-h-0 flex-col gap-3"}>
                                {(SETTINGS_QUERY_ENGINE !==
                                  CLP_QUERY_ENGINES.PRESTO ||
                                  PRESTO_SQL_INTERFACE.GUIDED ===
                                  sqlInterface) && (
                                    <div className={"shrink-0"}>
                                        <SearchResultsTimeline projection={selectedFields}/>
                                    </div>
                                )}
                                <div className={"min-h-0 flex-1"}>
                                    <LogsDataTable
                                        data={logEventData}
                                        selectedFields={selectedFields}/>
                                </div>
                            </div>
                        }
                        patternsDataTable={
                            <PatternsDataTable
                                dataset={dataset}
                                onAddPatternFilter={handleAddPatternFilter}
                                onRemovePatternFilter={handleRemovePatternFilter}/>
                        }
                    />
                </div>
            </div>
        </>
    );
};

export default ExplorePage;
