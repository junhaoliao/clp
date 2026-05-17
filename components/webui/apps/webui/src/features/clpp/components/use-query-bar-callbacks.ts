import {
    useCallback,
    useMemo,
} from "react";

import {
    type CompletionItem,
    parseQueryContext,
} from "./use-query-completions";


type BarState = {
    activeIndex: number;
    apply: (item: CompletionItem, query: string) => string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    items: CompletionItem[];
    onQuerySubmit: (q: string) => void;
    query: string;
    setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
    showDropdown: boolean;
    update: (ctx: ReturnType<typeof parseQueryContext>) => void;
};

/**
 * Keyboard handler for the query bar dropdown.
 *
 * @param e
 * @param s
 */
const onKey = (e: React.KeyboardEvent, s: BarState) => {
    if (!s.showDropdown || 0 === s.items.length) {
        if ("Enter" === e.key) {
            s.onQuerySubmit(s.query);
            s.setShowDropdown(false);
        }

        return;
    }
    if ("ArrowDown" === e.key) {
        e.preventDefault();
        s.setActiveIndex((p) => Math.min(p + 1, s.items.length - 1));
    } else if ("ArrowUp" === e.key) {
        e.preventDefault();
        s.setActiveIndex((p) => Math.max(p - 1, 0));
    } else if ("Enter" === e.key) {
        e.preventDefault();
        const item = s.items[s.activeIndex];
        if (item) {
            s.setQuery(s.apply(item, s.query));
            s.setShowDropdown(false);
            s.inputRef.current?.focus();
        }
    } else if ("Escape" === e.key) {
        s.setShowDropdown(false);
    }
};

/**
 * Input change handler for the query bar.
 *
 * @param value
 * @param s
 */
const onInput = (value: string, s: BarState) => {
    s.setQuery(value);
    const ctx = parseQueryContext(value);
    s.update(ctx);
    s.setShowDropdown("none" !== ctx.type);
};

/**
 * Focus handler for the query bar.
 *
 * @param s
 */
const onFocus = (s: BarState) => {
    const ctx = parseQueryContext(s.query);
    s.update(ctx);
    if ("none" !== ctx.type) {
        s.setShowDropdown(true);
    }
};

/**
 * Completion selection handler.
 *
 * @param sel
 * @param s
 */
const onSelect = (sel: CompletionItem, s: BarState) => {
    s.setQuery(s.apply(sel, s.query));
    s.setShowDropdown(false);
    s.inputRef.current?.focus();
};

/**
 * Builds callback handlers for the query bar.
 *
 * @param deps
 * @return Callback handlers for the query bar.
 */
const useQueryBarCallbacks = (deps: BarState) => {
    const st = useMemo(() => ({
        activeIndex: deps.activeIndex,
        apply: deps.apply,
        inputRef: deps.inputRef,
        items: deps.items,
        onQuerySubmit: deps.onQuerySubmit,
        query: deps.query,
        setActiveIndex: deps.setActiveIndex,
        setQuery: deps.setQuery,
        setShowDropdown: deps.setShowDropdown,
        showDropdown: deps.showDropdown,
        update: deps.update,
    }), [
        deps.activeIndex,
        deps.apply,
        deps.inputRef,
        deps.items,
        deps.onQuerySubmit,
        deps.query,
        deps.setActiveIndex,
        deps.setQuery,
        deps.setShowDropdown,
        deps.showDropdown,
        deps.update,
    ]);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onInput(e.target.value, st);
        },
        [st],
    );
    const handleFocus = useCallback(() => {
        onFocus(st);
    }, [st]);
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            onKey(e, st);
        },
        [st],
    );
    const handleSelect = useCallback(
        (sel: CompletionItem) => {
            onSelect(sel, st);
        },
        [st],
    );

    return {
        handleFocus,
        handleInputChange,
        handleKeyDown,
        handleSelect,
    };
};


export {useQueryBarCallbacks};
