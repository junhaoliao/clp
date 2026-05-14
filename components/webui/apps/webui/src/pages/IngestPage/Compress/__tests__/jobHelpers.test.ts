import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {CLP_STORAGE_ENGINES} from "@webui/common/config";


vi.mock("../../../../config", () => ({
    SETTINGS_STORAGE_ENGINE: CLP_STORAGE_ENGINES.CLP_S,
}));

vi.mock("../../../../settings", () => ({
    settings: {
        ClpStorageEngine: "clp-s",
        ClpQueryEngine: "presto",
        LogsInputType: "fs",
        LogsInputRootDir: null,
        MaxDatasetsPerQuery: null,
        MongoDbSearchResultsMetadataCollectionName: "",
        SqlDbClpArchivesTableName: "",
        SqlDbClpDatasetsTableName: "",
        SqlDbClpFilesTableName: "",
        SqlDbClpTablePrefix: "",
        SqlDbCompressionJobsTableName: "",
    },
}));


const {
    applyClpSFields,
    buildS3Payload,
    filterValidS3Paths,
    getSuccessMessage,
} = await import("../jobHelpers");


describe("applyClpSFields", () => {
    it("should set default dataset when dataset is undefined", () => {
        const payload = {} as any;
        applyClpSFields(payload, {unstructured: undefined} as any);
        expect(payload.dataset).toBe("default");
    });

    it("should set default dataset when dataset is empty string", () => {
        const payload = {} as any;
        applyClpSFields(payload, {dataset: "", unstructured: undefined} as any);
        expect(payload.dataset).toBe("default");
    });

    it("should use provided dataset name", () => {
        const payload = {} as any;
        applyClpSFields(payload, {dataset: "my-dataset", unstructured: undefined} as any);
        expect(payload.dataset).toBe("my-dataset");
    });

    it("should set unstructured=true when unstructured is true", () => {
        const payload = {} as any;
        applyClpSFields(payload, {dataset: "test", unstructured: true} as any);
        expect(payload.unstructured).toBe(true);
    });

    it("should set timestampKey when unstructured is not true", () => {
        const payload = {} as any;
        applyClpSFields(payload, {
            dataset: "test",
            timestampKey: "x.y",
            unstructured: false,
        } as any);
        expect(payload.timestampKey).toBe("x.y");
    });

    it("should not set timestampKey when unstructured is true", () => {
        const payload = {} as any;
        applyClpSFields(payload, {
            dataset: "test",
            timestampKey: "x.y",
            unstructured: true,
        } as any);
        expect(payload.timestampKey).toBeUndefined();
    });

    it("should set schemaContent when it is a non-empty string and unstructured is true", () => {
        const payload = {} as any;
        applyClpSFields(payload, {
            dataset: "test",
            schemaContent: ":timestamp:string\n:level:string",
            unstructured: true,
        } as any);
        expect(payload.schemaContent).toBe(":timestamp:string\n:level:string");
        expect(payload.unstructured).toBeUndefined();
    });

    it("should not set schemaContent when it is undefined", () => {
        const payload = {} as any;
        applyClpSFields(payload, {dataset: "test", unstructured: undefined} as any);
        expect(payload.schemaContent).toBeUndefined();
    });

    it("should not set schemaContent when it is empty string", () => {
        const payload = {} as any;
        applyClpSFields(payload, {
            dataset: "test",
            schemaContent: "",
            unstructured: undefined,
        } as any);
        expect(payload.schemaContent).toBeUndefined();
    });
});

describe("buildS3Payload", () => {
    it("should include schemaContent in S3 payload when unstructured is true", () => {
        const payload = buildS3Payload({
            bucket: "my-bucket",
            regionCode: "us-east-1",
            s3Paths: [],
            scanner: false,
            values: {
                dataset: "test",
                schemaContent: ":timestamp:string",
                unstructured: true,
            },
        });
        expect(payload.schemaContent).toBe(":timestamp:string");
    });
});

describe("filterValidS3Paths", () => {
    it("should filter out empty and whitespace-only paths", () => {
        expect(filterValidS3Paths(["path1", "", "  ", "path2"])).toEqual(["path1", "path2"]);
    });

    it("should return empty array for undefined input", () => {
        expect(filterValidS3Paths(undefined)).toEqual([]);
    });
});

describe("getSuccessMessage", () => {
    it("should return compression job message", () => {
        expect(getSuccessMessage({type: "compression", jobId: 42}))
            .toBe("Compression job submitted with ID: 42");
    });

    it("should return scanner job message for single job", () => {
        expect(getSuccessMessage({type: "scanner", jobIds: [7]}))
            .toBe("Scanner job created with ID: 7");
    });

    it("should return scanner jobs message for multiple jobs", () => {
        expect(getSuccessMessage({type: "scanner", jobIds: [1, 2, 3]}))
            .toBe("Scanner jobs created with IDs: 1, 2, 3");
    });
});
