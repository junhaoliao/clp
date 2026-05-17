import {
    useCallback,
    useMemo,
    useState,
} from "react";

import {useQuery} from "@tanstack/react-query";
import {type AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";


const api = hc<AppType>("/");
const FIELD_VALUES_LIMIT = 10;

type CompletionItem = {
    description?: string;
    label: string;
    type: "field" | "operator" | "syntax-hint";
};

type QueryContext =
    | {type: "field-list"} |
    {prefix: string; type: "field-prefix"} |
    {field: string; type: "field-values"} |
    {type: "connectors"} |
    {type: "none"};

/**
 * Checks if a trimmed query string ends with a complete clause.
 *
 * @param text
 * @return Whether the query ends with a complete clause.
 */
const isCompleteClause = (text: string): boolean => {
    const trimmed = text.trimEnd();

    return (/\w+:\s*\S+\s*$/).test(trimmed) ||
        (/\w+:\s*\*\s*$/).test(trimmed);
};

/**
 * Checks if a query string ends with a connector (and/or/not)
 * followed by a space, indicating a new clause should start.
 *
 * @param text The original (untrimmed) query text.
 * @return Whether the query ends with a connector + space.
 */
const endsWithConnector = (text: string): boolean => {
    return (/\b(and|or|not)\s+$/).test(text);
};

/**
 * Parses the current query text to determine valid completions.
 *
 * @param text
 * @return The parsed query context.
 */
const parseQueryContext = (text: string): QueryContext => {
    const trimmed = text.trimEnd();

    if ("" === trimmed) {
        return {type: "field-list"};
    }

    if (trimmed.endsWith(":")) {
        const fieldPart = trimmed.split(/\s+/).pop() ?? "";
        const field = fieldPart.slice(0, -1);

        return {field: field, type: "field-values"};
    }

    // After "and ", "or ", or "not " — show field list again.
    // Must check BEFORE isCompleteClause because trailing "and"/"or"/"not"
    // can be mistaken for a clause value.
    if (text.endsWith(" ") && endsWithConnector(text)) {
        return {type: "field-list"};
    }

    if (text.endsWith(" ") && isCompleteClause(trimmed)) {
        return {type: "connectors"};
    }

    const lastToken = trimmed.split(/\s+/).pop() ?? "";

    if (!lastToken.includes(":")) {
        return {prefix: lastToken, type: "field-prefix"};
    }

    return {type: "none"};
};

/**
 * Builds completion items from the current query context.
 *
 * @param context
 * @param fieldNames
 * @param fieldValues
 * @return Completion items for the context.
 */
const buildCompletionItems = (
    context: QueryContext,
    fieldNames: string[],
    fieldValues: string[],
): CompletionItem[] => {
    switch (context.type) {
        case "field-list":
            return [
                {description: "negate next clause", label: "not", type: "operator" as const},
                ...fieldNames.map((f) => ({
                    description: ":  equals some value",
                    label: f,
                    type: "field" as const,
                })),
            ];
        case "field-prefix": {
            const prefix = context.prefix.toLowerCase();
            const fieldMatches = fieldNames
                .filter((f) => f.toLowerCase().startsWith(prefix))
                .map((f) => ({
                    description: ":  equals some value",
                    label: f,
                    type: "field" as const,
                }));
            const operators: CompletionItem[] = [];
            if ("and".startsWith(prefix)) {
                operators.push({label: "and", type: "operator" as const});
            }
            if ("or".startsWith(prefix)) {
                operators.push({label: "or", type: "operator" as const});
            }
            if ("not".startsWith(prefix)) {
                operators.push({label: "not", type: "operator" as const});
            }

            return [...operators, ...fieldMatches];
        }
        case "field-values": {
            const items: CompletionItem[] = [{
                description: "exists in any form",
                label: "*",
                type: "syntax-hint" as const,
            }];

            for (const val of fieldValues) {
                items.push({
                    label: val,
                    type: "syntax-hint" as const,
                });
            }

            return items;
        }
        case "connectors":
            return [
                {label: "and", type: "operator" as const},
                {label: "or", type: "operator" as const},
                {label: "not", type: "operator" as const},
            ];
        default:
            return [];
    }
};

/**
 * Applies a completion item to the current query string.
 *
 * @param item
 * @param query
 * @return Updated query string.
 */
const applyCompletion = (
    item: CompletionItem,
    query: string,
): string => {
    const trimmed = query.trimEnd();

    if ("field" === item.type) {
        const lastToken = trimmed.split(/\s+/).pop() ?? "";
        const isPartial = !lastToken.includes(":");
        if (isPartial && 0 < trimmed.length) {
            const prefix = trimmed.slice(
                0,
                trimmed.length - lastToken.length,
            );

            return `${prefix}${item.label}: `;
        }
        if (0 === trimmed.length) {
            return `${item.label}: `;
        }

        return `${trimmed}${item.label}: `;
    }

    if ("operator" === item.type) {
        return `${trimmed} ${item.label} `;
    }

    return `${trimmed}${item.label} `;
};

/**
 * Custom hook for KQL query completion logic.
 *
 * @param fieldNames
 * @param dataset
 * @param activeField
 * @return Completion state and handlers.
 */
const useQueryCompletions = (
    fieldNames: string[],
    dataset: string,
    activeField?: string,
) => {
    const [items, setItems] = useState<CompletionItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    const {data: fieldValuesData} = useQuery({
        enabled: 0 < dataset.length && Boolean(activeField),
        placeholderData: (prev) => prev,
        queryFn: async () => {
            const res = await api.api["field-values"].$get({
                query: {
                    dataset: dataset,
                    field: activeField as string,
                    limit: FIELD_VALUES_LIMIT,
                },
            });

            if (!res.ok) {
                throw new Error("Failed to fetch field values");
            }

            return res.json();
        },
        queryKey: ["field-values",
            dataset,
            activeField],
        refetchInterval: false,
    });

    const fieldValues = useMemo(
        () => fieldValuesData?.values ?? [],
        [fieldValuesData?.values],
    );

    const update = useCallback((context: QueryContext) => {
        setItems(buildCompletionItems(context, fieldNames, fieldValues));
        setActiveIndex(0);
    }, [fieldNames,
        fieldValues]);

    const apply = useCallback((
        item: CompletionItem,
        query: string,
    ): string => applyCompletion(item, query), []);

    return {
        activeIndex,
        apply,
        items,
        setActiveIndex,
        update,
    };
};


export type {CompletionItem};
export {buildCompletionItems, parseQueryContext};
export {useQueryCompletions};
