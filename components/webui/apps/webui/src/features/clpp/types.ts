type SchemaTreeNode = {
    id: string;
    key: string;
    type: "string" | "int" | "float" | "object";
    count: number;
    children: SchemaTreeNode[];
};

type SchemaTreeResponse = {
    dataset: string;
    tree: SchemaTreeNode;
};

type LogEvent = Record<string, unknown> & {
    body: string;
    timestamp: string;
};

type LogtypeEntry = {
    archive_id: string;
    count: number;
    dataset?: string;
    id: number;
    log_type: string;
};

type LogtypeStatsResponse = {
    jobId: number;
    logtypes: LogtypeEntry[];
    totalCount: number;
};

type LogtypeExample = {
    archive_id: string;
    log_event_ix: number;
    message: string;
    timestamp: number;
};

type LogtypeExamplesResponse = {
    archive_id: string;
    dataset: string;
    examples: LogtypeExample[];
    logtype_id: number;
};

type FieldValuesResponse = {
    dataset: string;
    field: string;
    limit: number;
    values: string[];
};

/**
 * Creates a composite key for a logtype entry, unique across archives.
 *
 * @param entry
 * @return Composite key string `${archive_id}:${id}`.
 */
const logtypeCompositeKey = (entry: Pick<LogtypeEntry, "archive_id" | "id">): string => `${entry.archive_id}:${entry.id}`;

export type {
    FieldValuesResponse,
    LogEvent,
    LogtypeEntry,
    LogtypeExample,
    LogtypeExamplesResponse,
    LogtypeStatsResponse,
    SchemaTreeNode,
    SchemaTreeResponse,
};

export {logtypeCompositeKey};
