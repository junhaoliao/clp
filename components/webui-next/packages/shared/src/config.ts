enum CLP_QUERY_ENGINES {
    CLP = "clp",
    CLP_S = "clp-s",
    PRESTO = "presto",
}

enum CLP_STORAGE_ENGINES {
    CLP = "clp",
    CLP_S = "clp-s",
}

enum STORAGE_TYPE {
    FS = "fs",
    S3 = "s3",
}

const CLP_DEFAULT_DATASET_NAME = "default";

enum SqlTableSuffix {
    ARCHIVES = "archives",
    COLUMN_METADATA = "column_metadata",
    DATASETS = "datasets",
    FILES = "files",
}

const CLP_DEFAULT_TABLE_PREFIX = "clp_";

export {
    CLP_DEFAULT_DATASET_NAME,
    CLP_DEFAULT_TABLE_PREFIX,
    CLP_QUERY_ENGINES,
    CLP_STORAGE_ENGINES,
    SqlTableSuffix,
    STORAGE_TYPE,
};
