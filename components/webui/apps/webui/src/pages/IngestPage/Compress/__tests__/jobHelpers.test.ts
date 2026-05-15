import {CLP_STORAGE_ENGINES} from "@webui/common/config";
import {
    describe,
    expect,
    it,
    vi,
} from "vitest";


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

import type {
    ClpSFormValues,
    ClpSPayload,
} from "../jobHelpers";


describe("applyClpSFields", () => {
    it("should set default dataset when dataset is empty string", () => {
        const payload: Partial<ClpSPayload> = {};
        applyClpSFields(payload, {dataset: "", unstructured: void 0} as unknown as Partial<ClpSFormValues>); // eslint-disable-line no-void
        expect(payload.dataset).toBe("default");
    });

    it("should use provided dataset name", () => {
        const payload: Partial<ClpSPayload> = {};
        applyClpSFields(payload, {dataset: "my-dataset", unstructured: void 0} as unknown as Partial<ClpSFormValues>); // eslint-disable-line no-void
        expect(payload.dataset).toBe("my-dataset");
    });

    it("should set unstructured=true when unstructured is true", () => {
        const payload: Partial<ClpSPayload> = {};
        applyClpSFields(payload, {dataset: "test", unstructured: true});
        expect(payload.unstructured).toBe(true);
    });

    it("should set timestampKey when unstructured is not true", () => {
        const payload: Partial<ClpSPayload> = {};
        applyClpSFields(payload, {
            dataset: "test",
            timestampKey: "x.y",
            unstructured: false,
        });
        expect(payload.timestampKey).toBe("x.y");
    });

    it("should not set timestampKey when unstructured is true", () => {
        const payload: Partial<ClpSPayload> = {};
        applyClpSFields(payload, {
            dataset: "test",
            timestampKey: "x.y",
            unstructured: true,
        });
        expect(payload.timestampKey).toBeUndefined();
    });

    it("should set schemaContent when it is a non-empty string and unstructured is true", () => {
        const payload: Partial<ClpSPayload> = {};
        applyClpSFields(payload, {
            dataset: "test",
            schemaContent: ":timestamp:string\n:level:string",
            unstructured: true,
        });
        expect(payload.schemaContent).toBe(":timestamp:string\n:level:string");
        expect(payload.unstructured).toBeUndefined();
    });

    it("should not set schemaContent when it is empty string", () => {
        const payload: Partial<ClpSPayload> = {};
        applyClpSFields(payload, {
            dataset: "test",
            schemaContent: "",
            unstructured: void 0, // eslint-disable-line no-void
        } as unknown as Partial<ClpSFormValues>);
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
        expect(filterValidS3Paths(["path1",
            "",
            "  ",
            "path2"])).toEqual(["path1",
            "path2"]);
    });

    it("should return empty array for void input", () => {
        expect(filterValidS3Paths(void 0 as never)).toEqual([]); // eslint-disable-line no-void
    });
});

const TEST_JOB_ID = 42;
const SINGLE_SCANNER_ID = 42;

describe("getSuccessMessage", () => {
    it("should return compression job message", () => {
        expect(getSuccessMessage({type: "compression", jobId: TEST_JOB_ID}))
            .toBe("Compression job submitted with ID: 42");
    });

    it("should return scanner job message for single job", () => {
        expect(getSuccessMessage({type: "scanner", jobIds: [SINGLE_SCANNER_ID]}))
            .toBe("Scanner job created with ID: 42");
    });

    it("should return scanner jobs message for multiple jobs", () => {
        expect(getSuccessMessage({type: "scanner",
            jobIds: [1,
                2,
                3]}))
            .toBe("Scanner jobs created with IDs: 1, 2, 3");
    });
});
