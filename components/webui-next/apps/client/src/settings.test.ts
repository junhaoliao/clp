import {
    describe,
    expect,
    test,
    vi,
} from "vitest";


describe("settings", () => {
    test("loads and exports settings from settings.json", async () => {
        const mockSettings = {
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
        };

        const jsonMock = vi.fn().mockResolvedValue(mockSettings);
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: jsonMock,
        });

        vi.stubGlobal("fetch", fetchMock);

        // Dynamically import to trigger the module-level await
        const {settings} = await import("./settings");

        expect(fetchMock).toHaveBeenCalledWith("settings.json");
        expect(settings).toEqual(mockSettings);
    });
});
