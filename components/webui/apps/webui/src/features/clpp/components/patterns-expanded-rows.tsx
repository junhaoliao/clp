import {
    logtypeCompositeKey,
    type LogtypeEntry,
    type LogtypeExample,
} from "@/features/clpp/types";


/**
 * Extracts variable/field names from a logtype template.
 *
 * @param logType
 * @return List of unique field names.
 */
const extractTokens = (logType: string): string[] => {
    const matches = logType.matchAll(/%([^%]+)%/g);

    return [
        ...new Set(
            [...matches].map((m) => {
                const parts = m[1]?.split(".") ?? [];

                return parts.pop() ?? "";
            }),
        ),
    ];
};

/**
 * Renders example log events for an expanded logtype.
 *
 * @param root0
 * @param root0.examples
 * @return JSX element
 */
const ExampleEvents = ({examples}: {examples: LogtypeExample[]}) => {
    if (0 === examples.length) {
        return (
            <p className={"text-muted-foreground italic"}>
                No example events found.
            </p>
        );
    }

    return (
        <div className={"space-y-1"}>
            <span className={"font-semibold"}>Examples:</span>
            {examples.map((ex, i) => (
                <pre
                    key={`${ex.archive_id}-${ex.log_event_ix}-${i}`}
                    className={
                        "whitespace-pre-wrap break-all" +
                        " bg-background rounded p-1.5 text-xs font-mono"
                    }
                >
                    {ex.message}
                </pre>
            ))}
        </div>
    );
};

/**
 * Expanded details for selected logtype entries.
 *
 * @param root0
 * @param root0.examplesMap
 * @param root0.filtered
 * @param root0.expandedIds
 * @return JSX element
 */
const ExpandedRows = ({examplesMap, filtered, expandedIds}: {
    examplesMap: Map<string, LogtypeExample[]>;
    filtered: LogtypeEntry[];
    expandedIds: Set<string>;
}) => (
    <div className={"space-y-2"}>
        {filtered
            .filter((lt) => expandedIds.has(logtypeCompositeKey(lt)))
            .map((lt) => {
                const ck = logtypeCompositeKey(lt);

                return (
                    <div
                        key={ck}
                        className={
                            "ml-6 border-l px-4 py-2 text-xs" +
                            " space-y-2 bg-muted/30 rounded-r-md"
                        }
                    >
                        <p>
                            <span className={"font-semibold"}>Tokens:</span>
                            {" "}
                            {extractTokens(lt.log_type).join(", ") || "none"}
                        </p>
                        <p>
                            <span className={"font-semibold"}>Regex:</span>
                            {" "}
                            <code className={"text-foreground"}>
                                {lt.log_type}
                            </code>
                        </p>
                        <p className={"text-muted-foreground"}>
                            <span className={"font-semibold text-foreground"}>
                                ID:
                            </span>
                            {" "}
                            {lt.id}
                            {lt.archive_id && (
                                <>
                                    {" "}
                                    | Archive:
                                    {" "}
                                    <code className={"text-foreground"}>
                                        {lt.archive_id}
                                    </code>
                                </>
                            )}
                        </p>
                        <ExampleEvents
                            examples={examplesMap.get(ck) ?? []}/>
                    </div>
                );
            })}
    </div>
);


export {ExpandedRows};
