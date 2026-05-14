import {
    useEffect,
    useRef,
} from "react";

import {useDashboardTimeStore} from "../stores/time-store";


/**
 * Auto-refresh hook with Page Visibility API.
 * Triggers a callback at the configured refresh interval.
 * Pauses when the tab is hidden.
 *
 * @param callback
 */
export function useAutoRefresh (callback: () => void) {
    const refreshInterval = useDashboardTimeStore((s) => s.refreshInterval);
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        if (!refreshInterval) {
            return;
        }

        const ms = parseInterval(refreshInterval);
        if (0 >= ms) {
            return;
        }

        let isVisible = !document.hidden;
        let timerId: ReturnType<typeof setInterval> | null = null;

        const start = () => {
            if (timerId) {
                return;
            }
            timerId = setInterval(() => {
                if (isVisible) {
                    callbackRef.current();
                }
            }, ms);
        };

        const stop = () => {
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
        };

        const onVisibilityChange = () => {
            isVisible = !document.hidden;
            if (isVisible) {
                callbackRef.current();
                start();
            } else {
                stop();
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);

        if (isVisible) {
            start();
        }

        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            stop();
        };
    }, [refreshInterval]);
}

/**
 *
 * @param interval
 */
export function parseInterval (interval: string): number {
    const match = interval.match(/^(\d+)(s|m)$/);
    if (!match) {
        return 0;
    }
    const num = parseInt(match[1]!, 10);
    const unit = match[2];
    if ("m" === unit) {
        return num * 60000;
    }

    return num * 1000;
}
