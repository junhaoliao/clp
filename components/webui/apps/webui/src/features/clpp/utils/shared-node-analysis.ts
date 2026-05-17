import type {LogtypeEntry} from "@/features/clpp/types";


export interface SharedNodeWarning {
    variableIndex: number;
    types: Set<string>;
    logtypes: string[];
    message: string;
}

/**
 * Analyzes logtype entries to detect shared-node deduplication traps.
 * Currently, the logtype-stats API does not provide variable/type information,
 * so this always returns an empty array. Once variable metadata is available
 * from the API, this function can be extended to perform the analysis.
 *
 * @param _logtypes
 * @return Array of shared-node warnings (currently always empty).
 */
const analyzeSharedNodes = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _logtypes: LogtypeEntry[],
): SharedNodeWarning[] => {
    // Variable/type metadata is not yet available in the logtype-stats API.
    // Return no warnings until that data is available.
    return [];
};

export {analyzeSharedNodes};
