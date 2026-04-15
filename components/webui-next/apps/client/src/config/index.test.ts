import {
    describe,
    expect,
    test,
    vi,
} from "vitest";


// Mock settings module
vi.mock("../settings", () => ({
    settings: {
        ClpStorageEngine: "clp-s",
        ClpQueryEngine: "clp-s",
        LogsInputType: "fs",
        LogsInputRootDir: "/mnt/logs",
        MaxDatasetsPerQuery: 10,
        MongoDbSearchResultsMetadataCollectionName: "results-metadata",
        SqlDbClpArchivesTableName: "",
        SqlDbClpDatasetsTableName: "clp_datasets",
        SqlDbClpFilesTableName: "",
        SqlDbClpTablePrefix: "clp_",
        SqlDbCompressionJobsTableName: "compression_jobs",
    },
}));


describe("config", () => {
    test("exports correct storage type", async () => {
        const {SETTINGS_LOGS_INPUT_TYPE} = await import("./index");
        expect(SETTINGS_LOGS_INPUT_TYPE).toBe("fs");
    });

    test("exports correct storage engine", async () => {
        const {SETTINGS_STORAGE_ENGINE} = await import("./index");
        expect(SETTINGS_STORAGE_ENGINE).toBe("clp-s");
    });

    test("exports correct query engine", async () => {
        const {SETTINGS_QUERY_ENGINE} = await import("./index");
        expect(SETTINGS_QUERY_ENGINE).toBe("clp-s");
    });

    test("computes stream type as json for CLP-S storage engine", async () => {
        const {STREAM_TYPE} = await import("./index");
        expect(STREAM_TYPE).toBe("json");
    });

    test("computes stream type as ir for CLP storage engine", async () => {
        vi.resetModules();
        vi.doMock("../settings", () => ({
            settings: {
                ClpStorageEngine: "clp",
                ClpQueryEngine: "clp",
                LogsInputType: "fs",
            },
        }));
        const {STREAM_TYPE} = await import("./index");
        expect(STREAM_TYPE).toBe("ir");
    });
});
