import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {usePseudoProgress} from "./use-pseudo-progress";


describe("usePseudoProgress", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("starts with null progress", () => {
        const {result} = renderHook(() => usePseudoProgress());
        expect(result.current.progress).toBeNull();
    });

    it("increments progress after start", () => {
        const {result} = renderHook(() => usePseudoProgress());

        act(() => {
            result.current.start();
        });

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(result.current.progress).toBe(5);
    });

    it("caps progress at 100", () => {
        const {result} = renderHook(() => usePseudoProgress());

        act(() => {
            result.current.start();
        });

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.progress).toBe(100);
    });

    it("resets progress to null on stop", () => {
        const {result} = renderHook(() => usePseudoProgress());

        act(() => {
            result.current.start();
        });

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current.progress).toBeGreaterThan(0);

        act(() => {
            result.current.stop();
        });

        expect(result.current.progress).toBeNull();
    });

    it("cleans up interval on unmount", () => {
        const {result, unmount} = renderHook(() => usePseudoProgress());

        act(() => {
            result.current.start();
        });

        unmount();

        // Should not throw — interval is cleaned up
        act(() => {
            vi.advanceTimersByTime(1000);
        });
    });
});
