
enum QUERY_LOADING_STATE {
    SUBMITTING = 0,
    WAITING,
    LOADING,
}

/**
 * Values in enum `QUERY_LOADING_STATE`.
 */
const QUERY_LOADING_STATE_VALUES = Object.freeze(
    Object.values(QUERY_LOADING_STATE).filter((value) => "number" === typeof value)
);

/**
 * Enum of job type, matching the `QueryJobType` class in
 * `job_orchestration.query_scheduler.constants`.
 *
 * @enum {number}
 */
enum QUERY_JOB_TYPE {
    SEARCH_OR_AGGREGATION = 0,
    EXTRACT_IR,
    EXTRACT_JSON,
}

/**
 * Mapping between job type enums and stream type
 */
const EXTRACT_JOB_TYPE = Object.freeze({
    ir: QUERY_JOB_TYPE.EXTRACT_IR,
    json: QUERY_JOB_TYPE.EXTRACT_JSON,
});

interface QueryLoadingStateDescription {
    label: string;
    description: string;
}

/**
 * Descriptions for query loading states.
 */
const QUERY_LOADING_STATE_DESCRIPTIONS
: Record<QUERY_LOADING_STATE, QueryLoadingStateDescription> =
    Object.freeze({
        [QUERY_LOADING_STATE.SUBMITTING]: {
            label: "Submitting query Job",
            description: "Parsing arguments and submitting job to the server.",
        },
        [QUERY_LOADING_STATE.WAITING]: {
            label: "Waiting for job to finish",
            description: "The job is running. Waiting for the job to finish.",
        },
        [QUERY_LOADING_STATE.LOADING]: {
            label: "Loading Log Viewer",
            description: "The query has been completed and the results are being loaded.",
        },
    });

export {
    EXTRACT_JOB_TYPE,
    QUERY_JOB_TYPE,
    QUERY_LOADING_STATE,
    QUERY_LOADING_STATE_DESCRIPTIONS,
    QUERY_LOADING_STATE_VALUES,
};
