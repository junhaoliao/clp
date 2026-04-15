import {
    describe,
    expect,
    test,
} from "vitest";

import {
    CLP_DEFAULT_DATASET_NAME,
    CLP_DEFAULT_TABLE_PREFIX,
    CLP_QUERY_ENGINES,
    CLP_STORAGE_ENGINES,
    SqlTableSuffix,
    STORAGE_TYPE,
} from "./config.js";


describe("CLP_QUERY_ENGINES", () => {
    test("has expected engine values", () => {
        expect(CLP_QUERY_ENGINES.CLP).toBe("clp");
        expect(CLP_QUERY_ENGINES.CLP_S).toBe("clp-s");
        expect(CLP_QUERY_ENGINES.PRESTO).toBe("presto");
    });
});

describe("CLP_STORAGE_ENGINES", () => {
    test("has expected engine values", () => {
        expect(CLP_STORAGE_ENGINES.CLP).toBe("clp");
        expect(CLP_STORAGE_ENGINES.CLP_S).toBe("clp-s");
    });
});

describe("STORAGE_TYPE", () => {
    test("has expected storage types", () => {
        expect(STORAGE_TYPE.FS).toBe("fs");
        expect(STORAGE_TYPE.S3).toBe("s3");
    });
});

describe("CLP_DEFAULT_DATASET_NAME", () => {
    test("is 'default'", () => {
        expect(CLP_DEFAULT_DATASET_NAME).toBe("default");
    });
});

describe("SqlTableSuffix", () => {
    test("has expected suffixes", () => {
        expect(SqlTableSuffix.ARCHIVES).toBe("archives");
        expect(SqlTableSuffix.COLUMN_METADATA).toBe("column_metadata");
        expect(SqlTableSuffix.DATASETS).toBe("datasets");
        expect(SqlTableSuffix.FILES).toBe("files");
    });
});

describe("CLP_DEFAULT_TABLE_PREFIX", () => {
    test("is 'clp_'", () => {
        expect(CLP_DEFAULT_TABLE_PREFIX).toBe("clp_");
    });
});
