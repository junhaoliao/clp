import {useState} from "react";

import {X} from "lucide-react";

import type {LogtypeEntry} from "@/features/clpp/types";
import {analyzeSharedNodes} from "@/features/clpp/utils/shared-node-analysis";


/**
 * Dismissable banner warning about schema deduplication traps.
 *
 * Shows when shared nodes are detected in the logtype data —
 * these indicate fields where different logtypes contribute
 * different types to the same schema tree position, which
 * causes ambiguous query results.
 *
 * @param root0
 * @param root0.logtypes
 * @return A dismissable warning banner, or null if no warnings or dismissed.
 */
const SchemaDeduplicationWarning = ({logtypes}: {logtypes: LogtypeEntry[]}) => {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) {
        return null;
    }

    const warnings = analyzeSharedNodes(logtypes);
    if (0 === warnings.length) {
        return null;
    }

    return (
        <div
            className={
                "flex items-start gap-3 " +
                "rounded-md border border-yellow-300 bg-yellow-50 p-3"
            }
        >
            <div className={"flex-1 space-y-1"}>
                <p className={"text-sm font-medium text-yellow-800"}>
                    Schema Deduplication Trap Detected
                </p>
                <p className={"text-xs text-yellow-700"}>
                    {warnings.length}
                    {" "}
                    shared node
                    {1 !== warnings.length ?
                        "s" :
                        ""}
                    {" "}
                    found
                    where variables appear in multiple logtypes with inconsistent types.
                    This can cause ambiguous query results.
                </p>
                <ul className={"list-inside list-disc text-xs text-yellow-700"}>
                    {warnings.map((w, i) => (
                        <li key={i}>
                            Variable #
                            {w.variableIndex}
                            :
                            {" "}
                            {w.logtypes.join(", ")}
                        </li>
                    ))}
                </ul>
            </div>
            <button
                className={"text-yellow-600 hover:text-yellow-800"}
                onClick={() => {
                    setDismissed(true);
                }}
            >
                <X className={"h-4 w-4"}/>
            </button>
        </div>
    );
};


export {SchemaDeduplicationWarning};
export default SchemaDeduplicationWarning;
