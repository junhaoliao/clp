import {QUERY_JOB_TYPE} from "@webui/common/query";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {logtypeStatsRoutes} from "../logtype-stats.js";


const MOCK_JOB_ID = 99;
const HTTP_BAD_REQUEST = 400;
const HTTP_OK = 200;
const HTTP_INTERNAL_ERROR = 500;

interface LogtypeDoc {
    count: number;
    logtype: string;
    template: string;
    variables: Array<{index: number; type: string}>;
}

interface LogtypeStatsResponse {
    jobId: number;
    logtypes: LogtypeDoc[];
    totalCount: number;
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

const app = logtypeStatsRoutes;

beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitJob.mockResolvedValue(MOCK_JOB_ID);
    mockAwaitJobCompletion.mockResolvedValue(void 0); // eslint-disable-line no-void
    mockCreateCollection.mockResolvedValue(void 0); // eslint-disable-line no-void
    mockFind.mockReturnValue({toArray: vi.fn().mockResolvedValue([])});
    mockDrop.mockResolvedValue(void 0); // eslint-disable-line no-void
});

describe("Logtype Stats Route — validation and success", () => {
    it("should reject request without dataset param", async () => {
        const res = await app.request("/");
        expect(res.status).toBe(HTTP_BAD_REQUEST);
    });

    it("should reject request with empty dataset", async () => {
        const res = await app.request("/?dataset=");
        expect(res.status).toBe(HTTP_BAD_REQUEST);
    });

    it("should return logtypes for valid dataset", async () => {
        const logtypeDocs = [
            {
                logtype: "abc123",
                count: 42,
                template: "user=%s logged in",
                variables: [{index: 0, type: "string"}],
            },
        ];

        mockFind.mockReturnValue({
            toArray: vi.fn().mockResolvedValue(logtypeDocs),
        });

        const res = await app.request("/?dataset=my-data");
        expect(res.status).toBe(HTTP_OK);

        const body = await res.json() as LogtypeStatsResponse;
        expect(body.jobId).toBe(MOCK_JOB_ID);
        expect(body.logtypes).toHaveLength(1);
        expect(body.logtypes[0]?.logtype).toBe("abc123");
        expect(body.totalCount).toBe(1);
    });
});

describe("Logtype Stats Route — job management", () => {
    it("should submit LOGTYPE_STATS job type", async () => {
        mockFind.mockReturnValue({toArray: vi.fn().mockResolvedValue([])});

        await app.request("/?dataset=another-ds");

        expect(mockSubmitJob).toHaveBeenCalledWith(
            {dataset: "another-ds"},
            QUERY_JOB_TYPE.LOGTYPE_STATS,
        );
    });

    it("should return 500 when job submission fails", async () => {
        mockSubmitJob.mockRejectedValue(new Error("Connection refused"));

        const res = await app.request("/?dataset=test");
        expect(res.status).toBe(HTTP_INTERNAL_ERROR);

        const body = await res.json() as ErrorResponse;
        expect(body.error).toBe("Connection refused");
    });

    it("should return 500 when job execution fails", async () => {
        mockAwaitJobCompletion.mockRejectedValue(new Error("Task timeout"));

        const res = await app.request("/?dataset=test");
        expect(res.status).toBe(HTTP_INTERNAL_ERROR);

        const body = await res.json() as ErrorResponse;
        expect(body.error).toBe("Task timeout");
    });

    it("should return empty logtypes for empty results", async () => {
        mockFind.mockReturnValue({toArray: vi.fn().mockResolvedValue([])});

        const res = await app.request("/?dataset=empty-ds");
        expect(res.status).toBe(HTTP_OK);

        const body = await res.json() as LogtypeStatsResponse;
        expect(body.logtypes).toEqual([]);
        expect(body.totalCount).toBe(0);
    });
});
