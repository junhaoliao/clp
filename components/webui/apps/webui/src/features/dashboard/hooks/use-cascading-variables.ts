import {useEffect, useCallback} from "react";
import type {DashboardVariable} from "@webui/common/dashboard/types";
import {useDashboardVariableStore} from "../stores/variable-store";

/**
 * Resolves cascading variable dependencies.
 * When a parent variable changes, dependent variables are re-evaluated
 * by querying the datasource with the new parent value interpolated.
 */
export function useCascadingVariables(variables: DashboardVariable[]) {
  const variableValues = useDashboardVariableStore((s) => s.variableValues);
  const setVariableValue = useDashboardVariableStore((s) => s.setVariableValue);

  // Build dependency map: parent -> children
  const dependents = new Map<string, DashboardVariable[]>();
  for (const v of variables) {
    if (v.dependsOn) {
      for (const parentName of v.dependsOn) {
        const children = dependents.get(parentName) ?? [];
        children.push(v);
        dependents.set(parentName, children);
      }
    }
  }

  const resolveDependents = useCallback(async (parentName: string) => {
    const children = dependents.get(parentName);
    if (!children) return;

    for (const child of children) {
      if (child.type !== "query" || !child.query || !child.datasource) continue;

      const parentValue = variableValues[parentName];
      const interpolatedQuery = String(child.query).replace(
        /\$\{?.*?\}?/g,
        (match) => {
          const varName = match.replace(/^\$\{?/, "").replace(/\}?$/, "");
          if (varName === parentName && parentValue !== undefined) {
            return String(parentValue);
          }
          const val = variableValues[varName];
          return val !== undefined ? String(val) : match;
        },
      );

      try {
        const response = await fetch(`/api/datasource/${child.datasource.type}/query`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            requestId: `var-${child.id}`,
            queries: [{refId: child.id, datasource: child.datasource, query: interpolatedQuery}],
            range: {from: Date.now() - 3600000, to: Date.now()},
          }),
        });
        if (!response.ok) continue;
        const result = await response.json() as {data: {fields: {name: string; values: unknown[]}[]; length: number}[]; errors?: {message: string}[]};
        if (result.errors?.length) continue;

        const frame = result.data[0];
        if (!frame || frame.length === 0) continue;

        // First field values become the variable options
        const values = frame.fields[0]?.values ?? [];
        const options = values.map((v) => ({
          value: v,
          text: String(v),
          selected: false,
        }));

        // Update variable options via the layout store
        setVariableValue(child.name, options[0]?.value ?? "");

        // Recursively resolve dependents of this child
        await resolveDependents(child.name);
      } catch {
        // Silently fail - variable keeps its current value
      }
    }
  }, [variableValues, dependents, setVariableValue]);

  // When variableValues change, check for cascading updates
  useEffect(() => {
    for (const name of Object.keys(variableValues)) {
      const children = dependents.get(name);
      if (children && children.length > 0) {
        const timer = setTimeout(() => resolveDependents(name), 100);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [variableValues, dependents, resolveDependents]);

  return {resolveDependents};
}

/**
 * Returns variables in dependency order (parents before children).
 */
export function resolveVariableOrder(variables: DashboardVariable[]): DashboardVariable[] {
  const byName = new Map(variables.map((v) => [v.name, v]));
  const visited = new Set<string>();
  const result: DashboardVariable[] = [];

  function visit(name: string) {
    if (visited.has(name)) return;
    visited.add(name);
    const v = byName.get(name);
    if (!v) return;
    if (v.dependsOn) {
      for (const parentName of v.dependsOn) {
        visit(parentName);
      }
    }
    result.push(v);
  }

  for (const v of variables) {
    visit(v.name);
  }

  return result;
}
