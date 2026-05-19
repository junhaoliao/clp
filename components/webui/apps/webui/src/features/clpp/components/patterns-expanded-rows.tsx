import {
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
 * Expanded details for a single logtype entry, rendered inline beneath the row.
 *
 * @param root0
 * @param root0.entry
 * @param root0.examples
 * @return JSX element
 */
const ExpandedRowContent = ({entry, examples}: {
    entry: LogtypeEntry;
    examples: LogtypeExample[];
}) => (
    <div
        className={
            "ml-6 border-l px-4 py-2 text-xs" +
            " space-y-2 bg-muted/30 rounded-r-md"
        }
    >
        <p>
            <span className={"font-semibold"}>Tokens:</span>
            {" "}
            {extractTokens(entry.log_type).join(", ") || "none"}
        </p>
        <p>
            <span className={"font-semibold"}>Regex:</span>
            {" "}
            <code className={"text-foreground"}>
                {entry.log_type}
            </code>
        </p>
        <p className={"text-muted-foreground"}>
            <span className={"font-semibold text-foreground"}>
                ID:
            </span>
            {" "}
            {entry.id}
            {entry.archive_id && (
                <>
                    {" "}
                    | Archive:
                    {" "}
                    <code className={"text-foreground"}>
                        {entry.archive_id}
                    </code>
                </>
            )}
        </p>
        <ExampleEvents
            examples={examples}/>
    </div>
);


export {ExpandedRowContent};
