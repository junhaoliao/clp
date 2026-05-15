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

type LogtypeEntry = {
    id: number;
    count: number;
    log_type: string;
    archive_id?: string;
    dataset?: string;
};

type LogtypeStatsResponse = {
    jobId: number;
    logtypes: LogtypeEntry[];
    totalCount: number;
};

export type {
    LogtypeEntry,
    LogtypeStatsResponse,
    SchemaTreeNode,
    SchemaTreeResponse,
};
