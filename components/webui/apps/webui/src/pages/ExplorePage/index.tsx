import {useState} from "react";

import {useQuery} from "@tanstack/react-query";
import {CLP_QUERY_ENGINES} from "@webui/common/config";
import type {AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import {SETTINGS_QUERY_ENGINE} from "../../config";
import ExploreTabs from "./ExploreTabs";
import styles from "./index.module.css";
import {ProgressBar} from "./ProgressBar";
import SearchControls from "./SearchControls";
import SearchResultsTable from "./SearchResults/SearchResultsTable";
import SearchResultsTimeline from "./SearchResults/SearchResultsTimeline";
import useSearchStore from "./SearchState";
import usePrestoSearchState from "./SearchState/Presto";
import {PRESTO_SQL_INTERFACE} from "./SearchState/Presto/typings";
import {useUpdateStateWithMetadata} from "./SearchState/useUpdateStateWithMetadata";

import FieldBrowser from "@/features/clpp/components/field-browser";
import FilterBar, {type Filter} from "@/features/clpp/components/filter-bar";
import QueryInterpretationPanel from "@/features/clpp/components/query-interpretation-panel";
import type {SchemaTreeResponse} from "@/features/clpp/types";


const api = hc<AppType>("/");

type SchemaTreeNode = {
    id: string;
    key: string;
    type: string;
    count: number;
    children: SchemaTreeNode[];
};

/**
 *
 * @param node
 * @param parentPath
 */
const flattenFieldNames = (node: SchemaTreeNode, parentPath: string = ""): string[] => {
    const path = parentPath ?
        `${parentPath}.${node.key}` :
        node.key;
    const names: string[] = [];
    if ("object" !== node.type) {
        names.push(path);
    }
    for (const child of node.children) {
        names.push(...flattenFieldNames(child, path));
    }

    return names;
};


/**
 * Provides a search interface that allows users to query archives and visualize search results.
 *
 * @return
 */
const ExplorePage = () => {
    useUpdateStateWithMetadata();
    const sqlInterface = usePrestoSearchState((state) => state.sqlInterface);
    const selectedDatasets = useSearchStore((state) => state.selectedDatasets);
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [filters, setFilters] = useState<Filter[]>([]);

    const dataset: string = selectedDatasets[0] ?? "";

    const {data: treeData} = useQuery({
        queryKey: ["schema-tree",
            dataset],
        queryFn: async () => {
            const res = await api.api["schema-tree"].$get({
                query: {dataset},
            });

            if (!res.ok) {
                throw new Error("Failed to fetch schema tree");
            }

            return res.json() as Promise<SchemaTreeResponse>;
        },
        enabled: 0 < dataset.length,
    });

    const clppFieldOptions: string[] = treeData?.tree ?
        flattenFieldNames(treeData.tree) :
        [];
    const fieldOptions = [
        "timestamp",
        "level",
        "service",
        ...clppFieldOptions,
    ];

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

    const addFilter = (filter: Filter) => {
        setFilters((prev) => [
            ...prev,
            filter,
        ]);
    };

    const removeFilter = (id: string) => {
        setFilters((prev) => prev.filter((f) => f.id !== id));
    };

    return (
        <>
            {SETTINGS_QUERY_ENGINE === CLP_QUERY_ENGINES.PRESTO && <ProgressBar/>}
            <div className={"flex h-full"}>
                <FieldBrowser
                    dataset={dataset}
                    selectedFields={selectedFields}
                    onToggleField={toggleField}/>
                <div className={"flex flex-1 flex-col min-h-0"}>
                    <FilterBar
                        fieldOptions={fieldOptions}
                        filters={filters}
                        onAddFilter={addFilter}
                        onRemoveFilter={removeFilter}/>
                    <QueryInterpretationPanel/>
                    <ExploreTabs dataset={dataset}>
                        <div className={styles["searchPageContainer"]}>
                            <SearchControls/>
                            {(SETTINGS_QUERY_ENGINE !== CLP_QUERY_ENGINES.PRESTO ||
                              PRESTO_SQL_INTERFACE.GUIDED === sqlInterface) &&
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
