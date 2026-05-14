import {
    act,
    renderHook,
} from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {useLazyPanel} from "../use-lazy-panel";


describe("useLazyPanel", () => {
    let observerInstances: IntersectionObserver[] = [];
    const originalIO = globalThis.IntersectionObserver;

    beforeEach(() => {
        observerInstances = [];
        globalThis.IntersectionObserver = vi.fn().mockImplementation((callback) => {
            const instance = {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
                _callback: callback,
            };

            observerInstances.push(instance as unknown as IntersectionObserver);

            return instance;
        });
    });

    afterEach(() => {
        globalThis.IntersectionObserver = originalIO;
    });

    it("should return isVisible=false initially", () => {
        const {result} = renderHook(() => useLazyPanel());
        expect(result.current.isVisible).toBe(false);
    });

    it("should set isVisible=true when element enters viewport", () => {
        const {result} = renderHook(() => useLazyPanel());

        const node = document.createElement("div");
        act(() => {
            result.current.ref(node);
        });

        // Simulate intersection
        const observer = observerInstances[0] as unknown as {_callback: (entries: IntersectionObserverEntry[]) => void};
        act(() => {
            observer._callback([{isIntersecting: true} as IntersectionObserverEntry]);
        });

        expect(result.current.isVisible).toBe(true);
    });

    it("should set isVisible=false when element leaves viewport", () => {
        const {result} = renderHook(() => useLazyPanel());

        const node = document.createElement("div");
        act(() => {
            result.current.ref(node);
        });

        const observer = observerInstances[0] as unknown as {_callback: (entries: IntersectionObserverEntry[]) => void};
        act(() => {
            observer._callback([{isIntersecting: true} as IntersectionObserverEntry]);
        });
        expect(result.current.isVisible).toBe(true);

        act(() => {
            observer._callback([{isIntersecting: false} as IntersectionObserverEntry]);
        });
        expect(result.current.isVisible).toBe(false);
    });

    it("should disconnect observer on cleanup", () => {
        const {result, unmount} = renderHook(() => useLazyPanel());

        const node = document.createElement("div");
        act(() => {
            result.current.ref(node);
        });

        const observer = observerInstances[0] as unknown as {disconnect: ReturnType<typeof vi.fn>};
        unmount();
        expect(observer.disconnect).toHaveBeenCalled();
    });

    it("should handle null ref without error", () => {
        const {result} = renderHook(() => useLazyPanel());

        act(() => {
            result.current.ref(null);
        });

        expect(result.current.isVisible).toBe(false);
    });
});
