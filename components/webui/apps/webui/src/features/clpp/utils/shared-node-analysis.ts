export interface VariableOccurrence {
    index: number;
    logtype: string;
    type: "string" | "int" | "float";
}

export interface SharedNodeWarning {
    variableIndex: number;
    types: Set<string>;
    logtypes: string[];
    message: string;
}

/**
 * Counts the number of `%VAR%` placeholders in a logtype template string.
 *
 * @param template
 * @return The number of variable placeholders in the template.
 */
const countVariables = (template: string): number => {
    const matches = template.match(/%VAR%/g);
    return matches ?
        matches.length :
        0;
};

/**
 * Analyzes logtype entries to detect shared-node deduplication traps —
 * variables that appear in multiple logtypes with inconsistent types.
 *
 * @param logtypes
 * @return Array of shared-node warnings for inconsistent variable types.
 */
const analyzeSharedNodes = (
    logtypes: Array<{logtype: string;
        template: string;
        variables: Array<{index: number; type: string}>;}>,
): SharedNodeWarning[] => {
    const indexMap = new Map<number, Array<{logtype: string; type: string}>>();

    for (const entry of logtypes) {
        for (const v of entry.variables) {
            if (!indexMap.has(v.index)) {
                indexMap.set(v.index, []);
            }
            const bucket = indexMap.get(v.index);
            if (bucket) {
                bucket.push({logtype: entry.logtype, type: v.type});
            }
        }
    }

    const warnings: SharedNodeWarning[] = [];
    for (const [index, occurrences] of indexMap) {
        if (1 < occurrences.length) {
            const types = new Set(occurrences.map((o) => o.type));
            if (1 < types.size) {
                const typeList = [...types].join(", ");
                warnings.push({
                    variableIndex: index,
                    types: types,
                    logtypes: occurrences.map((o) => o.logtype),
                    message: `Variable at position ${index} appears in ` +
                        `${occurrences.length} logtypes with inconsistent ` +
                        `types (${typeList}). This creates a shared node ` +
                        "in the schema tree that may cause ambiguous " +
                        "query results.",
                });
            }
        }
    }

    return warnings;
};

export {
    analyzeSharedNodes, countVariables,
};
