import type {DashboardPanel} from "@webui/common/dashboard/types";
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    autoCompact,
    clampGridPosForDrag,
    clampGridPosForResize,
    findAvailablePosition,
    hasOverlap,
    snapDeltaToGrid,
} from "../grid-utils";


/**
 *
 * @param id
 * @param x
 * @param y
 * @param w
 * @param h
 */
const makePanel = (id: string, x: number, y: number, w: number, h: number): DashboardPanel => ({
    id,
    type: "timeseries",
    title: id,
    gridPos: {x, y, w, h},
    datasource: {type: "mysql", uid: "ds1"},
    queries: [],
    options: {},
});

describe("Grid Utils", () => {
    describe("findAvailablePosition", () => {
        it("should return (0,0) for empty grid", () => {
            const pos = findAvailablePosition([], 6, 4);
            expect(pos).toEqual({x: 0, y: 0, w: 6, h: 4});
        });

        it("should place panel next to existing panel", () => {
            const panels = [makePanel("p1", 0, 0, 6, 4)];
            const pos = findAvailablePosition(panels, 6, 4);
            expect(pos.x).toBe(6);
            expect(pos.y).toBe(0);
        });

        it("should place panel below if no horizontal space", () => {
            const panels = [makePanel("p1", 0, 0, 12, 4)];
            const pos = findAvailablePosition(panels, 6, 4);
            expect(pos.x).toBe(0);
            expect(pos.y).toBe(4);
        });

        it("should place full-width panel below existing panels", () => {
            const panels = [makePanel("p1", 0, 0, 6, 4),
                makePanel("p2", 6, 0, 6, 4)];
            const pos = findAvailablePosition(panels, 12, 4);
            expect(pos.y).toBe(4);
        });
    });

    describe("hasOverlap", () => {
        it("should detect overlapping panels", () => {
            const panels = [makePanel("p1", 0, 0, 6, 4)];
            expect(hasOverlap(panels, {x: 3, y: 0, w: 6, h: 4})).toBe(true);
        });

        it("should not detect non-overlapping panels", () => {
            const panels = [makePanel("p1", 0, 0, 6, 4)];
            expect(hasOverlap(panels, {x: 6, y: 0, w: 6, h: 4})).toBe(false);
        });

        it("should exclude specified panel from overlap check", () => {
            const panels = [makePanel("p1", 0, 0, 6, 4)];
            expect(hasOverlap(panels, {x: 0, y: 0, w: 6, h: 4}, "p1")).toBe(false);
        });

        it("should detect vertical overlap", () => {
            const panels = [makePanel("p1", 0, 0, 6, 4)];
            expect(hasOverlap(panels, {x: 0, y: 2, w: 6, h: 4})).toBe(true);
        });
    });

    describe("autoCompact", () => {
        it("should move panels up to fill gaps", () => {
            const panels = [
                makePanel("p1", 0, 0, 6, 4),
                makePanel("p2", 0, 8, 6, 4), // Gap at y=4
            ];
            const result = autoCompact(panels);
            expect(result.find((p) => "p2" === p.id)?.gridPos.y).toBe(4);
        });

        it("should not move panels if no gaps", () => {
            const panels = [
                makePanel("p1", 0, 0, 6, 4),
                makePanel("p2", 0, 4, 6, 4),
            ];
            const result = autoCompact(panels);
            expect(result.find((p) => "p1" === p.id)?.gridPos.y).toBe(0);
            expect(result.find((p) => "p2" === p.id)?.gridPos.y).toBe(4);
        });

        it("should handle empty grid", () => {
            expect(autoCompact([])).toEqual([]);
        });
    });

    describe("snapDeltaToGrid", () => {
        it("should snap pixel delta to grid units", () => {
            // cellWidth=100, cellHeight=60, gutter=8
            const result = snapDeltaToGrid(108, 68, 100, 60);
            expect(result).toEqual({dx: 1, dy: 1});
        });

        it("should round to nearest grid unit", () => {
            // 54px is ~0.5 cells, should round to 1
            const result = snapDeltaToGrid(54, 0, 100, 60);
            expect(result.dx).toBe(1);
        });

        it("should return 0 for small movements", () => {
            const result = snapDeltaToGrid(20, 10, 100, 60);
            expect(result).toEqual({dx: 0, dy: 0});
        });

        it("should handle negative deltas", () => {
            const result = snapDeltaToGrid(-108, -68, 100, 60);
            expect(result).toEqual({dx: -1, dy: -1});
        });
    });

    describe("clampGridPosForDrag", () => {
        it("should clamp x to keep panel within grid", () => {
            expect(clampGridPosForDrag({x: 15, y: 0, w: 6, h: 4})).toEqual({x: 6, y: 0, w: 6, h: 4});
        });

        it("should clamp negative x to 0", () => {
            expect(clampGridPosForDrag({x: -1, y: 0, w: 6, h: 4})).toEqual({x: 0, y: 0, w: 6, h: 4});
        });

        it("should preserve w when x fits", () => {
            expect(clampGridPosForDrag({x: 3, y: 2, w: 6, h: 4})).toEqual({x: 3, y: 2, w: 6, h: 4});
        });
    });

    describe("clampGridPosForResize", () => {
        it("should shrink width to not exceed grid", () => {
            expect(clampGridPosForResize({x: 10, y: 0, w: 6, h: 4})).toEqual({x: 10, y: 0, w: 2, h: 4});
        });

        it("should enforce minimum width of 1", () => {
            expect(clampGridPosForResize({x: 0, y: 0, w: 0, h: 4})).toEqual({x: 0, y: 0, w: 1, h: 4});
        });

        it("should enforce minimum height of 1", () => {
            expect(clampGridPosForResize({x: 0, y: 0, w: 6, h: 0})).toEqual({x: 0, y: 0, w: 6, h: 1});
        });

        it("should pass through valid positions", () => {
            expect(clampGridPosForResize({x: 3, y: 2, w: 6, h: 4})).toEqual({x: 3, y: 2, w: 6, h: 4});
        });
    });
});
