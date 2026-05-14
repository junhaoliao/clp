import {CLP_QUERY_ENGINES} from "@webui/common/config";
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    clpAggregationToDataFrame,
    clpDocumentsToDataFrame,
} from "../clp";


describe("clpDocumentsToDataFrame", () => {
    it("returns empty DataFrame for empty docs", () => {
        const frame = clpDocumentsToDataFrame([], "A", CLP_QUERY_ENGINES.CLP_S);
        expect(frame).toEqual({name: "A", fields: [], length: 0});
    });

    it("converts CLP-S documents with dataset and archive_id fields", () => {
        const docs = [
            {_id: "1", message: "error occurred", timestamp: 1715000001000, dataset: "default", archive_id: "abc123", log_event_ix: 0, orig_file_path: ""},
            {_id: "2", message: "warning issued", timestamp: 1715000002000, dataset: "prod", archive_id: "def456", log_event_ix: 1, orig_file_path: ""},
        ];

        const frame = clpDocumentsToDataFrame(docs, "A", CLP_QUERY_ENGINES.CLP_S);

        expect(frame.name).toBe("A");
        expect(frame.length).toBe(2);
        expect(frame.fields).toHaveLength(4);

        const [ts,
            msg,
            ds,
            aid] = frame.fields;

        expect(ts!.name).toBe("timestamp");
        expect(ts!.type).toBe("time");
        expect(ts!.values).toEqual([1715000001000,
            1715000002000]);

        expect(msg!.name).toBe("message");
        expect(msg!.type).toBe("string");
        expect(msg!.values).toEqual(["error occurred",
            "warning issued"]);

        expect(ds!.name).toBe("dataset");
        expect(ds!.type).toBe("string");
        expect(ds!.values).toEqual(["default",
            "prod"]);

        expect(aid!.name).toBe("archive_id");
        expect(aid!.type).toBe("string");
        expect(aid!.values).toEqual(["abc123",
            "def456"]);
    });

    it("converts CLP documents with orig_file_path field", () => {
        const docs = [
            {_id: "1", message: "hello", timestamp: 1715000001000, orig_file_id: "f1", orig_file_path: "/var/log/app.log", log_event_ix: 0},
        ];

        const frame = clpDocumentsToDataFrame(docs, "B", CLP_QUERY_ENGINES.CLP);

        expect(frame.name).toBe("B");
        expect(frame.length).toBe(1);
        expect(frame.fields).toHaveLength(3);

        const [, , fpath] = frame.fields;
        expect(fpath!.name).toBe("orig_file_path");
        expect(fpath!.type).toBe("string");
        expect(fpath!.values).toEqual(["/var/log/app.log"]);
    });

    it("truncates results exceeding maxResults and sets rowsTruncated", () => {
        const docs = Array.from({length: 5}, (_, i) => ({
            _id: String(i),
            message: `msg${i}`,
            timestamp: 1715000001000 + i,
            dataset: "default",
            archive_id: "a",
            log_event_ix: i,
            orig_file_path: "",
        }));

        const frame = clpDocumentsToDataFrame(docs, "C", CLP_QUERY_ENGINES.CLP_S, 3);

        expect(frame.length).toBe(3);
        expect(frame.rowsTruncated).toBe(true);
    });

    it("handles missing optional fields gracefully", () => {
        const docs = [
            {_id: "1", message: "test", timestamp: 1715000001000},
        ] as unknown as Parameters<typeof clpDocumentsToDataFrame>[0];

        const frame = clpDocumentsToDataFrame(docs, "D", CLP_QUERY_ENGINES.CLP_S);

        expect(frame.length).toBe(1);

        // dataset and archive_id should default to ""
        const ds = frame.fields.find((f) => "dataset" === f.name);
        const aid = frame.fields.find((f) => "archive_id" === f.name);
        expect(ds?.values).toEqual([""]);
        expect(aid?.values).toEqual([""]);
    });
});

describe("clpAggregationToDataFrame", () => {
    it("returns empty DataFrame for empty docs", () => {
        const frame = clpAggregationToDataFrame([], "A");
        expect(frame).toEqual({name: "A", fields: [], length: 0});
    });

    it("converts timeline bucket documents", () => {
        const docs = [
            {_id: "1", timestamp: 1715000000000, count: 5},
            {_id: "2", timestamp: 1715000060000, count: 12},
            {_id: "3", timestamp: 1715000120000, count: 3},
        ];

        const frame = clpAggregationToDataFrame(docs, "timeline");

        expect(frame.name).toBe("timeline");
        expect(frame.length).toBe(3);
        expect(frame.fields).toHaveLength(2);

        const [ts, cnt] = frame.fields;
        expect(ts!.name).toBe("timestamp");
        expect(ts!.type).toBe("time");
        expect(ts!.values).toEqual([1715000000000,
            1715000060000,
            1715000120000]);

        expect(cnt!.name).toBe("count");
        expect(cnt!.type).toBe("number");
        expect(cnt!.values).toEqual([5,
            12,
            3]);
    });
});
