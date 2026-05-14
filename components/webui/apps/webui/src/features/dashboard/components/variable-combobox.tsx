import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {Combobox} from "@base-ui/react/combobox";
import type {DashboardVariable} from "@webui/common/dashboard/types";

import {useDashboardVariableStore} from "../stores/variable-store";


const DEBOUNCE_MS = 300;

interface VariableComboboxItem {
    label: string;
    value: string;
}

/**
 *
 * @param opts
 * @param opts.datasourceUid
 * @param opts.enabled
 * @param opts.query
 */
export function useVariableComboboxSearch (opts: {
    datasourceUid: string;
    enabled: boolean;
    query?: string;
}) {
    const [items, setItems] = useState<VariableComboboxItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const queryRef = useRef<string | undefined>(opts.query);

    queryRef.current = opts.query;

    const fetchOptions = useCallback(async (searchTerm?: string) => {
        if (!opts.enabled || !queryRef.current) {
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/datasource/mysql/query", {
                body: JSON.stringify({
                    queries: [{query: queryRef.current, refId: "search"}],
                    range: {from: Date.now() - 3600000, to: Date.now()},
                }),
                headers: {"Content-Type": "application/json"},
                method: "POST",
            });

            if (!res.ok) {
                setItems([]);

                return;
            }
            const data = await res.json() as {
                data: {fields: {name: string; values: unknown[]}[]; length: number}[];
            };
            const [frame] = data.data ?? [];
            if (!frame) {
                setItems([]);

                return;
            }
            const [firstField] = frame.fields;
            if (!firstField) {
                setItems([]);

                return;
            }
            const values = (firstField.values as string[]).filter((v) => "string" === typeof v && (undefined === searchTerm || v.toLowerCase().includes(searchTerm.toLowerCase())));

            setItems(values.map((v) => ({label: v, value: v})));
        } catch {
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [opts.enabled]);

    const search = useCallback((inputValue: string) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            void fetchOptions(inputValue);
        }, DEBOUNCE_MS);
    }, [fetchOptions]);

    useEffect(() => {
        if (opts.enabled) {
            void fetchOptions();
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [opts.enabled,
        fetchOptions]);

    return {isLoading: isLoading, items: items, search: search};
}

/**
 *
 * @param root0
 * @param root0.variable
 */
export const VariableCombobox = ({variable}: {variable: DashboardVariable}) => {
    const variableValues = useDashboardVariableStore((s) => s.variableValues);
    const setVariableValue = useDashboardVariableStore((s) => s.setVariableValue);
    const currentValue = variableValues[variable.name];

    const isQueryVariable = "query" === variable.type && undefined !== variable.query;
    const searchResult = useVariableComboboxSearch({
        datasourceUid: variable.datasource && "object" === typeof variable.datasource ?
            variable.datasource.uid :
            "",
        enabled: isQueryVariable,
        ...(isQueryVariable && variable.query ?
            {query: variable.query} :
            {}),
    });

    const staticOptions = (variable.options ?? []).map((opt) => ({
        label: String(opt.text),
        value: String(opt.value),
    }));

    const comboboxItems = isQueryVariable ?
        searchResult.items :
        staticOptions;

    const selectedValue = String(currentValue ?? variable.current?.value ?? variable.defaultValue ?? "");

    if (0 === comboboxItems.length && !isQueryVariable) {
        return (
            <div className={"flex items-center gap-1.5"}>
                <label className={"text-xs text-muted-foreground whitespace-nowrap"}>
                    {variable.label ?? variable.name}
                </label>
                <span className={"text-xs text-muted-foreground"}>No options</span>
            </div>
        );
    }

    return (
        <div className={"flex items-center gap-1.5"}>
            <label className={"text-xs text-muted-foreground whitespace-nowrap"}>
                {variable.label ?? variable.name}
            </label>
            <Combobox.Root
                items={comboboxItems}
                value={{label: selectedValue, value: selectedValue}}
                filter={isQueryVariable ?
                    null :
                    undefined}
                onInputValueChange={isQueryVariable ?
                    (inputValue: string) => {
                        searchResult.search(inputValue);
                    } :
                    undefined}
                onValueChange={(item: VariableComboboxItem | null) => {
                    if (item) {
                        setVariableValue(variable.name, item.value);
                    }
                }}
            >
                <Combobox.InputGroup className={"flex items-center h-6 rounded-md border border-input bg-background px-2 text-xs"}>
                    <Combobox.Input
                        className={"bg-transparent text-xs outline-none w-24"}
                        placeholder={`Select ${variable.name}...`}/>
                    <Combobox.Clear
                        aria-label={"Clear"}
                        className={"text-xs text-muted-foreground hover:text-foreground"}
                    >
                        x
                    </Combobox.Clear>
                    <Combobox.Trigger
                        aria-label={"Toggle"}
                        className={"text-xs text-muted-foreground hover:text-foreground ml-1"}
                    >
                        v
                    </Combobox.Trigger>
                </Combobox.InputGroup>

                <Combobox.Portal>
                    <Combobox.Positioner
                        className={"z-50"}
                        sideOffset={4}
                    >
                        <Combobox.Popup className={"bg-popover border rounded-md shadow-md text-xs max-h-48 overflow-auto"}>
                            <Combobox.Empty className={"px-2 py-1.5 text-muted-foreground"}>
                                {searchResult.isLoading ?
                                    "Loading..." :
                                    "No options found"}
                            </Combobox.Empty>
                            <Combobox.List>
                                {(item: VariableComboboxItem) => (
                                    <Combobox.Item
                                        className={"flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent data-[selected]:bg-accent/50"}
                                        key={item.value}
                                        value={item}
                                    >
                                        <Combobox.ItemIndicator className={"text-primary text-[10px]"}>
                                            *
                                        </Combobox.ItemIndicator>
                                        <span>
                                            {item.label}
                                        </span>
                                    </Combobox.Item>
                                )}
                            </Combobox.List>
                        </Combobox.Popup>
                    </Combobox.Positioner>
                </Combobox.Portal>
            </Combobox.Root>
        </div>
    );
};
