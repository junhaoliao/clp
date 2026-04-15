/* eslint-disable no-magic-numbers */
enum QUERY_JOB_STATUS {
    PENDING = 0,
    RUNNING = 1,
    SUCCEEDED = 2,
    FAILED = 3,
    CANCELLING = 4,
    CANCELLED = 5,
    KILLED = 6,
}
/* eslint-enable no-magic-numbers */

const QUERY_JOB_STATUS_WAITING_STATES = new Set([
    QUERY_JOB_STATUS.PENDING,
    QUERY_JOB_STATUS.RUNNING,
    QUERY_JOB_STATUS.CANCELLING,
]);

export {
    QUERY_JOB_STATUS,
    QUERY_JOB_STATUS_WAITING_STATES,
};
