import type {
    Column,
    PrestoError,
    RuntimeStats,
} from "presto-client";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";


// Capture the execute config so we can invoke callbacks in tests
let capturedExecuteConfig: {
    query: string;
    data: (error: PrestoError | null, data: unknown[][], columns: Column[]) => void;
    error: (error: PrestoError) => void;
    state: (error: PrestoError | null, queryId: string, stats: RuntimeStats) => void;
    success: () => void;
};

const mockKill = vi.fn();

vi.mock("presto-client", () => ({
    Client: class MockClient {
        constructor () {
            // no-op
        }

        execute (config: typeof capturedExecuteConfig) {
            capturedExecuteConfig = config;
        }

        kill (queryId: string) {
            mockKill(queryId);
        }
    },
}));

// Import after mock
import {PrestoClient} from "./presto-client.js";


describe("PrestoClient", () => {
    let client: PrestoClient;
    let callbacks: {
        onData: (rows: unknown[][], columns: Column[]) => void;
        onError: (error: PrestoError) => void;
        onSuccess: () => void;
        onState: (queryId: string, stats: RuntimeStats) => void;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        client = new PrestoClient({
            host: "localhost",
            port: 8080,
            catalog: "clp",
            schema: "default",
            user: "test",
        });
        callbacks = {
            onData: vi.fn<(rows: unknown[][], columns: Column[]) => void>(),
            onError: vi.fn<(error: PrestoError) => void>(),
            onSuccess: vi.fn<() => void>(),
            onState: vi.fn<(queryId: string, stats: RuntimeStats) => void>(),
        };
    });

    it("creates an instance", () => {
        expect(client).toBeInstanceOf(PrestoClient);
    });

    it("invokes onData when data callback receives data", () => {
        client.execute("SELECT 1", callbacks);
        const columns: Column[] = [{
            name: "col1",
            type: "varchar",
            typeSignature: {rawType: "varchar", arguments: [], literalArguments: [], typeArguments: []},
        }];

        capturedExecuteConfig.data(null, [["value"]], columns);

        expect(callbacks.onData).toHaveBeenCalledWith([["value"]], columns);
    });

    it("calls onError when data callback receives an error", () => {
        client.execute("SELECT 1", callbacks);
        const error = {message: "data error"} as PrestoError;

        capturedExecuteConfig.data(error, [], []);

        expect(callbacks.onError).toHaveBeenCalledWith(error);
        expect(callbacks.onData).not.toHaveBeenCalled();
    });

    it("skips data when data array is empty", () => {
        client.execute("SELECT 1", callbacks);

        capturedExecuteConfig.data(null, [], []);

        expect(callbacks.onData).not.toHaveBeenCalled();
    });

    it("calls onError from error callback", () => {
        client.execute("SELECT 1", callbacks);
        const error = {message: "execution error"} as PrestoError;

        capturedExecuteConfig.error(error);

        expect(callbacks.onError).toHaveBeenCalledWith(error);
    });

    it("calls onState when no error and queryId exists", () => {
        client.execute("SELECT 1", callbacks);
        const stats = {} as RuntimeStats;

        capturedExecuteConfig.state(null, "query-123", stats);

        expect(callbacks.onState).toHaveBeenCalledWith("query-123", stats);
    });

    it("skips onState when error is present", () => {
        client.execute("SELECT 1", callbacks);
        const error = {message: "state error"} as PrestoError;

        capturedExecuteConfig.state(error, "query-123", {} as RuntimeStats);

        expect(callbacks.onState).not.toHaveBeenCalled();
    });

    it("skips onState when queryId is falsy", () => {
        client.execute("SELECT 1", callbacks);

        capturedExecuteConfig.state(null, "", {} as RuntimeStats);

        expect(callbacks.onState).not.toHaveBeenCalled();
    });

    it("calls onSuccess when success callback fires", () => {
        client.execute("SELECT 1", callbacks);

        capturedExecuteConfig.success();

        expect(callbacks.onSuccess).toHaveBeenCalled();
    });

    it("delegates kill to underlying client", () => {
        client.kill("query-456");

        expect(mockKill).toHaveBeenCalledWith("query-456");
    });
});
