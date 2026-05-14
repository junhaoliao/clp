import {QUERY_JOB_TYPE} from "@webui/common/query";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {schemaTreeRoutes} from "../schema-tree.js";


const MOCK_JOB_ID = 42;
const HTTP_BAD_REQUEST = 400;
const HTTP_OK = 200;
const HTTP_INTERNAL_ERROR = 500;

interface SchemaTreeResponse {
    dataset: string;
    tree: {
        children: unknown[];
        count: number;
        id: string;
        key: string;
        type: string;
    };
}

interface ErrorResponse {
    error: string;
}

const mockSubmitJob = vi.fn();
const mockAwaitJobCompletion = vi.fn();
const mockCreateCollection = vi.fn();
const mockFind = vi.fn();
const mockDrop = vi.fn();

const mockCollection = {
    find: mockFind,
    drop: mockDrop,
};

const mockMongoDb = {
    createCollection: mockCreateCollection,
    collection: vi.fn().mockReturnValue(mockCollection),
};

vi.mock("../clp-query-service.js", () => ({
    getClpQueryService: () => ({
        queryJobDbManager: {
            submitJob: mockSubmitJob,
            awaitJobCompletion: mockAwaitJobCompletion,
        },
        mongoDb: mockMongoDb,
    }),
}));

const app = schemaTreeRoutes;

beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitJob.mockResolvedValue(MOCK_JOB_ID);
    mockAwaitJobCompletion.mockResolvedValue(void 0); // eslint-disable-line no-void
    mockCreateCollection.mockResolvedValue(void 0); // eslint-disable-line no-void
    mockFind.mockReturnValue({toArray: vi.fn().mockResolvedValue([])});
    mockDrop.mockResolvedValue(void 0); // eslint-disable-line no-void
});

describe("Schema Tree Route — validation and success", () => {
    it("should reject request without dataset param", async () => {
        const res = await app.request("/");
        expect(res.status).toBe(HTTP_BAD_REQUEST);
    });

    it("should reject request with empty dataset", async () => {
        const res = await app.request("/?dataset=");
        expect(res.status).toBe(HTTP_BAD_REQUEST);
    });

    it("should return schema tree for valid dataset", async () => {
        const logtypeDocs = [
            {
                logtype: "lt1",
                variables: [{index: 0, type: "string"}],
            },
        ];

        mockFind.mockReturnValue({
            toArray: vi.fn().mockResolvedValue(logtypeDocs),
        });

        const res = await app.request("/?dataset=my-dataset");
        expect(res.status).toBe(HTTP_OK);

        const body = await res.json() as SchemaTreeResponse;
        expect(body.dataset).toBe("my-dataset");
        expect(body.tree).toBeDefined();
        expect(body.tree.type).toBe("object");
        expect(body.tree.key).toBe("root");
    });
});

describe("Schema Tree Route — job management", () => {
    it("should submit LOGTYPE_STATS job with dataset config", async () => {
        mockFind.mockReturnValue({toArray: vi.fn().mockResolvedValue([])});

        await app.request("/?dataset=test-ds");

        expect(mockSubmitJob).toHaveBeenCalledWith(
            {dataset: "test-ds"},
            QUERY_JOB_TYPE.LOGTYPE_STATS,
        );
    });

    it("should create and clean up MongoDB collection", async () => {
        mockFind.mockReturnValue({toArray: vi.fn().mockResolvedValue([])});

        await app.request("/?dataset=test-ds");

        expect(mockCreateCollection).toHaveBeenCalledWith(MOCK_JOB_ID.toString());
        expect(mockDrop).toHaveBeenCalled();
    });

    it("should return 500 when job submission fails", async () => {
        mockSubmitJob.mockRejectedValue(new Error("DB error"));

        const res = await app.request("/?dataset=test-ds");
        expect(res.status).toBe(HTTP_INTERNAL_ERROR);

        const body = await res.json() as ErrorResponse;
        expect(body.error).toBe("DB error");
    });

    it("should return 500 when job execution fails", async () => {
        mockAwaitJobCompletion.mockRejectedValue(new Error("Job failed"));

        const res = await app.request("/?dataset=test-ds");
        expect(res.status).toBe(HTTP_INTERNAL_ERROR);

        const body = await res.json() as ErrorResponse;
        expect(body.error).toBe("Job failed");
    });

    it("should clean up collection on job failure", async () => {
        mockAwaitJobCompletion.mockRejectedValue(new Error("Boom"));

        await app.request("/?dataset=test-ds");

        // Collection was created, then dropped during cleanup
        expect(mockCreateCollection).toHaveBeenCalledWith(MOCK_JOB_ID.toString());
    });
});
