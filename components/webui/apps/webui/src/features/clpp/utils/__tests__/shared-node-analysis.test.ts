import {
    describe,
    expect,
    it,
} from "vitest";

import {analyzeSharedNodes} from "../shared-node-analysis";


describe("analyzeSharedNodes", () => {
    it("should return empty array for no logtypes", () => {
        expect(analyzeSharedNodes([])).toEqual([]);
    });

    it("should return empty array when variable metadata is unavailable", () => {
        const logtypes = [
            {id: 0, count: 1, log_type: "test message", archive_id: "a1"},
            {id: 1, count: 2, log_type: "another message", archive_id: "a1"},
        ];

        expect(analyzeSharedNodes(logtypes)).toEqual([]);
    });
});
