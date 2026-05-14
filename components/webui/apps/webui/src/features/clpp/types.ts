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
    logtype: string;
    count: number;
    template: string;
    variables: {index: number; type: "string" | "int" | "float"}[];
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
