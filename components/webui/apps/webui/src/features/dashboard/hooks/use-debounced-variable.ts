import {
    useCallback,
    useRef,
} from "react";

import {useDashboardVariableStore} from "../stores/variable-store";


const DEBOUNCE_MS = 300;

/**
 *
 */
export function useDebouncedVariableSetter () {
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const setVariableValue = useDashboardVariableStore((s) => s.setVariableValue);

    return useCallback((name: string, value: unknown) => {
        const existing = timers.current.get(name);
        if (existing) {
            clearTimeout(existing);
        }

        timers.current.set(name, setTimeout(() => {
            setVariableValue(name, value);
            timers.current.delete(name);
        }, DEBOUNCE_MS));
    }, [setVariableValue]);
}
