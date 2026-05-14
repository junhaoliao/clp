import {
    useCallback,
    useEffect,
} from "react";
import {useSearchParams} from "react-router";

import type {DashboardVariable} from "@webui/common/dashboard/types";

import {useDebouncedVariableSetter} from "../hooks/use-debounced-variable";
import {useDashboardVariableStore} from "../stores/variable-store";
import {VariableCombobox} from "./variable-combobox";


const ALL_VALUE = "$__all";

interface VariableBarProps {
    variables: DashboardVariable[];
}

/**
 *
 * @param root0
 * @param root0.variables
 */
export const VariableBar = ({variables}: VariableBarProps) => {
    const setVariableValue = useDashboardVariableStore((s) => s.setVariableValue);
    const variableValues = useDashboardVariableStore((s) => s.variableValues);
    const [searchParams, setSearchParams] = useSearchParams();

    // Read variable values from URL params on mount
    useEffect(() => {
        for (const v of variables) {
            const urlValue = searchParams.get(`var-${v.name}`);
            if (null !== urlValue) {
                if (v.multi) {
                    setVariableValue(v.name, urlValue.split(","));
                } else {
                    setVariableValue(v.name, urlValue);
                }
            }
        }
    }, []);

    // Write variable values to URL params on change
    const syncToUrl = useCallback(() => {
        const next = new URLSearchParams(searchParams);

        // Remove all existing var- params first
        for (const key of [...next.keys()]) {
            if (key.startsWith("var-")) {
                next.delete(key);
            }
        }
        for (const v of variables) {
            const value = variableValues[v.name];
            if (value !== undefined && "" !== value) {
                const serialized = Array.isArray(value) ?
                    value.join(",") :
                    String(value);

                next.set(`var-${v.name}`, serialized);
            }
        }
        setSearchParams(next, {replace: true});
    }, [variableValues,
        variables,
        searchParams,
        setSearchParams]);

    useEffect(() => {
        syncToUrl();
    }, [syncToUrl]);

    if (0 === variables.length) {
        return null;
    }

    return (
        <div className={"flex items-center gap-3 px-4 py-1.5 border-b bg-background/95"}>
            {variables.map((v) => (
                <VariableControl
                    key={v.id}
                    variable={v}/>
            ))}
        </div>
    );
};

/**
 *
 * @param root0
 * @param root0.variable
 */
const VariableControl = ({variable}: {variable: DashboardVariable}) => {
    if ("textbox" === variable.type) {
        return <TextboxVariable variable={variable}/>;
    }
    if ("interval" === variable.type) {
        return <IntervalVariable variable={variable}/>;
    }
    if ("datasource" === variable.type) {
        return <DatasourceVariable variable={variable}/>;
    }

    // Use Combobox for query variables with async search
    if ("query" === variable.type && !variable.multi) {
        return <VariableCombobox variable={variable}/>;
    }

    return <DropdownVariable variable={variable}/>;
};

/**
 *
 * @param root0
 * @param root0.variable
 */
const TextboxVariable = ({variable}: {variable: DashboardVariable}) => {
    const variableValues = useDashboardVariableStore((s) => s.variableValues);
    const debouncedSet = useDebouncedVariableSetter();
    const currentValue = variableValues[variable.name];

    return (
        <div className={"flex items-center gap-1.5"}>
            <label className={"text-xs text-muted-foreground whitespace-nowrap"}>
                {variable.label ?? variable.name}
            </label>
            <input
                className={"h-6 rounded border border-input bg-background px-2 text-xs w-24"}
                type={"text"}
                value={String(currentValue ?? variable.defaultValue ?? "")}
                onChange={(e) => {
                    debouncedSet(variable.name, e.target.value);
                }}/>
        </div>
    );
};

/**
 *
 * @param root0
 * @param root0.variable
 */
const IntervalVariable = ({variable}: {variable: DashboardVariable}) => {
    const variableValues = useDashboardVariableStore((s) => s.variableValues);
    const setVariableValue = useDashboardVariableStore((s) => s.setVariableValue);
    const currentValue = variableValues[variable.name];

    const intervals = ["1m",
        "5m",
        "10m",
        "30m",
        "1h",
        "6h",
        "12h",
        "1d"];
    const options = variable.options?.length ?
        variable.options :
        intervals.map((i) => ({value: i, text: i, selected: false}));

    return (
        <div className={"flex items-center gap-1.5"}>
            <label className={"text-xs text-muted-foreground whitespace-nowrap"}>
                {variable.label ?? variable.name}
            </label>
            <select
                className={"h-6 rounded-md border border-input bg-background px-2 text-xs"}
                value={String(currentValue ?? variable.defaultValue ?? "5m")}
                onChange={(e) => {
                    setVariableValue(variable.name, e.target.value);
                }}
            >
                {options.map((opt) => (
                    <option
                        key={String(opt.value)}
                        value={String(opt.value)}
                    >
                        {opt.text}
                    </option>
                ))}
            </select>
        </div>
    );
};

/**
 *
 * @param root0
 * @param root0.variable
 */
const DatasourceVariable = ({variable}: {variable: DashboardVariable}) => {
    const variableValues = useDashboardVariableStore((s) => s.variableValues);
    const setVariableValue = useDashboardVariableStore((s) => s.setVariableValue);
    const currentValue = variableValues[variable.name];
    const [datasources, setDatasources] = useState<{uid: string; name: string}[]>([]);

    useEffect(() => {
        fetch("/api/datasource")
            .then((res) => (res.ok ?
                res.json() :
                []))
            .then((data: {uid: string; name: string}[]) => {
                setDatasources(data);
            })
            .catch(() => {
                setDatasources([]);
            });
    }, []);

    const selected = String(currentValue ?? variable.defaultValue ?? datasources[0]?.uid ?? "");

    return (
        <div className={"flex items-center gap-1.5"}>
            <label className={"text-xs text-muted-foreground whitespace-nowrap"}>
                {variable.label ?? variable.name}
            </label>
            <select
                className={"h-6 rounded-md border border-input bg-background px-2 text-xs"}
                value={selected}
                onChange={(e) => {
                    setVariableValue(variable.name, e.target.value);
                }}
            >
                {datasources.map((ds) => (
                    <option
                        key={ds.uid}
                        value={ds.uid}
                    >
                        {ds.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

/**
 *
 * @param root0
 * @param root0.variable
 */
const DropdownVariable = ({variable}: {variable: DashboardVariable}) => {
    const variableValues = useDashboardVariableStore((s) => s.variableValues);
    const setVariableValue = useDashboardVariableStore((s) => s.setVariableValue);
    const currentValue = variableValues[variable.name];
    const options = variable.options ?? [];

    const isMulti = variable.multi ?? false;
    const includeAll = variable.includeAll ?? false;

    const selected = isMulti ?
        (Array.isArray(currentValue) ?
            currentValue :
            [currentValue].filter(Boolean)) :
        String(currentValue ?? variable.current?.value ?? variable.defaultValue ?? "");

    const handleChange = (value: string) => {
        if (isMulti) {
            if (value === ALL_VALUE) {
                const allValues = options.map((o) => o.value);
                setVariableValue(variable.name, allValues);

                return;
            }
            const current = Array.isArray(selected) ?
                [...selected] :
                [];
            const idx = current.indexOf(value);
            if (0 <= idx) {
                current.splice(idx, 1);
            } else {
                current.push(value);
            }
            setVariableValue(variable.name, current);

            return;
        }
        setVariableValue(variable.name, value);
    };

    if (isMulti) {
        return (
            <div className={"flex items-center gap-1.5"}>
                <label className={"text-xs text-muted-foreground whitespace-nowrap"}>
                    {variable.label ?? variable.name}
                </label>
                <div className={"flex flex-wrap gap-1"}>
                    {includeAll && (
                        <button
                            type={"button"}
                            className={`px-1.5 py-0.5 text-xs rounded border ${
                                (selected as unknown[]).length === options.length ?
                                    "bg-primary text-primary-foreground" :
                                    "bg-background hover:bg-accent"
                            }`}
                            onClick={() => {
                                handleChange(ALL_VALUE);
                            }}
                        >
                            All
                        </button>
                    )}
                    {options.map((opt) => (
                        <button
                            key={String(opt.value)}
                            type={"button"}
                            className={`px-1.5 py-0.5 text-xs rounded border ${
                                (selected as unknown[]).includes(opt.value) ?
                                    "bg-primary text-primary-foreground" :
                                    "bg-background hover:bg-accent"
                            }`}
                            onClick={() => {
                                handleChange(String(opt.value));
                            }}
                        >
                            {opt.text}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={"flex items-center gap-1.5"}>
            <label className={"text-xs text-muted-foreground whitespace-nowrap"}>
                {variable.label ?? variable.name}
            </label>
            <select
                className={"h-6 rounded-md border border-input bg-background px-2 text-xs"}
                value={String(selected)}
                onChange={(e) => {
                    handleChange(e.target.value);
                }}
            >
                {includeAll && (
                    <option value={ALL_VALUE}>All</option>
                )}
                {options.map((opt) => (
                    <option
                        key={String(opt.value)}
                        value={String(opt.value)}
                    >
                        {opt.text}
                    </option>
                ))}
            </select>
        </div>
    );
};
