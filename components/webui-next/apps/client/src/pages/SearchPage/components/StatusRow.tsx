import {SEARCH_UI_STATE} from "../../../stores/search-store";


/**
 * Status text row below the search controls.
 *
 * @param root0
 * @param root0.uiState
 * @return
 */
const StatusRow = ({uiState}: {uiState: SEARCH_UI_STATE}) => (
    <div className={"ml-0.5"}>
        {uiState === SEARCH_UI_STATE.QUERY_ID_PENDING && (
            <span className={"text-sm text-muted-foreground"}>Submitting query...</span>
        )}
        {uiState === SEARCH_UI_STATE.QUERYING && (
            <span className={"text-sm text-muted-foreground"}>Searching...</span>
        )}
        {uiState === SEARCH_UI_STATE.FAILED && (
            <span className={"text-sm text-destructive"}>Query failed</span>
        )}
    </div>
);


export {StatusRow};
