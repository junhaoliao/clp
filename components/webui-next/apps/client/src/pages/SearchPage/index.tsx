import {CLP_QUERY_ENGINES} from "@clp/webui-shared";

import {SETTINGS_QUERY_ENGINE} from "../../config";
import {useUpdateStateWithMetadata} from "../../hooks/use-update-state-with-metadata";
import {PrestoResultsTable} from "./components/PrestoResultsTable";
import {PrestoSearchControls} from "./components/PrestoSearchControls";
import {QueryStatus} from "./components/QueryStatus";
import {ResultsTable} from "./components/ResultsTable";
import {ResultsTimeline} from "./components/ResultsTimeline";
import {SearchControls} from "./components/SearchControls";


/**
 * Provides a search interface that allows users to query archives and visualize search results.
 */
const SearchPage = () => {
    const isPresto = CLP_QUERY_ENGINES.PRESTO === SETTINGS_QUERY_ENGINE;

    // Subscribe to results metadata to detect query completion/failure
    useUpdateStateWithMetadata();

    return (
        <div className={"flex flex-col flex-1 min-h-0 gap-2 p-6"}>
            {/* Search controls — native or Presto */}
            {isPresto ?
                <PrestoSearchControls/> :
                <SearchControls/>}

            {/* Query status — shows running/done/failed with result counts */}
            <QueryStatus/>

            {/* Timeline — only for native search, fixed height */}
            {!isPresto && (
                <div className={"shrink-0"}>
                    <ResultsTimeline/>
                </div>
            )}

            {/* Results table — native or Presto, fills remaining space */}
            <div className={"flex-1 min-h-0 overflow-hidden"}>
                {isPresto ?
                    <PrestoResultsTable/> :
                    <ResultsTable/>}
            </div>
        </div>
    );
};


export default SearchPage;
