import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {useQueryBarCallbacks} from "./use-query-bar-callbacks";
import {
    type CompletionItem,
    parseQueryContext,
    useQueryCompletions,
} from "./use-query-completions";


/**
 * Closes dropdown on click outside the query bar.
 *
 * @param showDropdown
 * @param setShowDropdown
 */
const useClickOutside = (
    showDropdown: boolean,
    setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>,
) => {
    useEffect(() => {
        if (!showDropdown) {
            return () => {
            };
        }
        const fn = (e: MouseEvent) => {
            if (!(e.target as HTMLElement)
                .closest("[data-query-bar]")) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", fn);

        return () => {
            document.removeEventListener("mousedown", fn);
        };
    }, [showDropdown,
        setShowDropdown]);
};

/**
 * Syncs an external value into internal query state when it changes.
 *
 * @param externalValue
 * @param setQuery
 */
const useExternalValueSync = (
    externalValue: string | null,
    setQuery: React.Dispatch<React.SetStateAction<string>>,
) => {
    useEffect(() => {
        if (null !== externalValue) {
            setQuery(externalValue);
        }
    }, [externalValue,
        setQuery]);
};

/**
 * Extracts the active field name from the query context.
 *
 * @param query
 * @return The field name if context is field-values, else empty string.
 */
const getActiveField = (query: string): string => {
    const ctx = parseQueryContext(query);
    if ("field-values" === ctx.type) {
        return ctx.field;
    }

    return "";
};

/**
 * Manages query bar state, completions, and handlers.
 *
 * @param fieldNames
 * @param onQuerySubmit
 * @param dataset
 * @param externalValue When non-null, syncs into the internal query state.
 * @return State and handlers for the query bar.
 */
const useQueryBarState = (
    fieldNames: string[],
    onQuerySubmit: (q: string) => void,
    dataset: string = "",
    externalValue: string | null = null,
) => {
    const [query, setQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useExternalValueSync(externalValue, setQuery);

    const activeField = getActiveField(query);
    const {items, activeIndex, update, apply, setActiveIndex} =
        useQueryCompletions(fieldNames, dataset, activeField);

    const {
        handleFocus,
        handleInputChange,
        handleKeyDown,
        handleSelect,
    } = useQueryBarCallbacks({
        activeIndex,
        apply,
        inputRef,
        items,
        onQuerySubmit,
        query,
        setActiveIndex,
        setQuery,
        setShowDropdown,
        showDropdown,
        update,
    });

    const handleClear = useCallback(() => {
        setQuery("");
        onQuerySubmit("");
    }, [onQuerySubmit,
        setQuery]);

    const handleSubmit = useCallback(() => {
        onQuerySubmit(query);
    }, [onQuerySubmit,
        query]);

    useClickOutside(showDropdown, setShowDropdown);

    return {
        activeIndex,
        handleClear,
        handleFocus,
        handleInputChange,
        handleKeyDown,
        handleSelect,
        handleSubmit,
        inputRef,
        items,
        query,
        setActiveIndex,
        setShowDropdown,
        showDropdown,
    };
};


export type {CompletionItem};
export {useQueryBarState};
