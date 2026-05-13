import {useDashboardLayoutStore} from "../stores/layout-store";
import {useDashboardVariableStore} from "../stores/variable-store";
import type {DashboardVariable} from "@webui/common/dashboard/types";
import {Plus, Trash2} from "lucide-react";

const VARIABLE_TYPES: DashboardVariable["type"][] = ["query", "custom", "textbox", "datasource", "interval"];

export function VariableEditor() {
  const dashboard = useDashboardLayoutStore((s) => s.dashboard);
  const setVariables = useDashboardLayoutStore((s) => s.setVariables);
  const variableValues = useDashboardVariableStore((s) => s.variableValues);

  if (!dashboard) return null;

  const variables = dashboard.variables;

  const addVariable = () => {
    const id = `var-${Date.now()}`;
    const newVar: DashboardVariable = {
      id,
      name: `var${variables.length + 1}`,
      type: "custom",
      options: [{value: "option1", text: "Option 1", selected: true}],
      current: {value: "option1", text: "Option 1"},
    };
    setVariables([...variables, newVar]);
  };

  const removeVariable = (varId: string) => {
    setVariables(variables.filter((v) => v.id !== varId));
  };

  const updateVariable = (varId: string, updates: Partial<DashboardVariable>) => {
    // Remove undefined values to satisfy exactOptionalPropertyTypes
    const cleaned = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    ) as Partial<DashboardVariable>;
    setVariables(variables.map((v) => v.id === varId ? {...v, ...cleaned} : v));
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Variables</h3>
        <button
          type="button"
          className="inline-flex items-center justify-center size-6 rounded hover:bg-accent"
          onClick={addVariable}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {variables.length === 0 && (
        <p className="text-xs text-muted-foreground">No variables. Click + to add one.</p>
      )}

      {variables.map((v) => (
        <div key={v.id} className="space-y-2 border rounded p-2">
          <div className="flex items-center gap-1">
            <code className="text-xs text-primary flex-1">${`{${v.name}}`}</code>
            <button
              type="button"
              className="inline-flex items-center justify-center size-5 rounded hover:bg-destructive/10"
              onClick={() => removeVariable(v.id)}
            >
              <Trash2 className="size-3 text-destructive" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Name</label>
              <input
                type="text"
                className="w-full h-6 rounded border border-input bg-background px-1.5 text-xs"
                value={v.name}
                onChange={(e) => updateVariable(v.id, {name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "")})}
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Label</label>
              <input
                type="text"
                className="w-full h-6 rounded border border-input bg-background px-1.5 text-xs"
                value={v.label ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateVariable(v.id, val ? {label: val} : {});
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground">Type</label>
            <select
              className="w-full h-6 rounded border border-input bg-background px-1.5 text-xs"
              value={v.type}
              onChange={(e) => updateVariable(v.id, {type: e.target.value as DashboardVariable["type"]})}
            >
              {VARIABLE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {(v.type === "query" || v.type === "custom") && (
            <div>
              <label className="text-[10px] text-muted-foreground">Depends On (parent variables)</label>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {variables.filter((other) => other.id !== v.id).map((other) => {
                  const selected = (v.dependsOn ?? []).includes(other.name);
                  return (
                    <button
                      key={other.id}
                      type="button"
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input"
                      }`}
                      onClick={() => {
                        const current = v.dependsOn ?? [];
                        const next = selected
                          ? current.filter((n) => n !== other.name)
                          : [...current, other.name];
                        updateVariable(v.id, next.length > 0 ? {dependsOn: next} : {});
                      }}
                    >
                      {other.label ?? other.name}
                    </button>
                  );
                })}
                {variables.filter((other) => other.id !== v.id).length === 0 && (
                  <span className="text-[10px] text-muted-foreground">No other variables</span>
                )}
              </div>
            </div>
          )}

          {v.type === "custom" && (
            <div>
              <label className="text-[10px] text-muted-foreground">Values (comma-separated)</label>
              <input
                type="text"
                className="w-full h-6 rounded border border-input bg-background px-1.5 text-xs"
                value={(v.options ?? []).map((o) => String(o.value)).join(", ")}
                onChange={(e) => {
                  const values = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                  const options = values.map((val) => ({value: val, text: val, selected: val === String(v.current?.value)}));
                  updateVariable(v.id, {options});
                }}
              />
            </div>
          )}

          {v.type === "query" && (
            <div>
              <label className="text-[10px] text-muted-foreground">Query</label>
              <textarea
                className="w-full h-12 rounded border border-input bg-background px-1.5 py-0.5 text-xs font-mono"
                value={v.query ?? ""}
                onChange={(e) => updateVariable(v.id, {query: e.target.value})}
              />
            </div>
          )}

          {v.type === "textbox" && (
            <div>
              <label className="text-[10px] text-muted-foreground">Default Value</label>
              <input
                type="text"
                className="w-full h-6 rounded border border-input bg-background px-1.5 text-xs"
                value={String(v.defaultValue ?? "")}
                onChange={(e) => updateVariable(v.id, {defaultValue: e.target.value})}
              />
            </div>
          )}

          {v.type === "interval" && (
            <div>
              <label className="text-[10px] text-muted-foreground">Intervals (comma-separated)</label>
              <input
                type="text"
                className="w-full h-6 rounded border border-input bg-background px-1.5 text-xs"
                value={(v.options ?? []).map((o) => String(o.value)).join(", ")}
                onChange={(e) => {
                  const values = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                  const options = values.map((val) => ({value: val, text: val, selected: val === String(v.current?.value)}));
                  updateVariable(v.id, {options});
                }}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`multi-${v.id}`}
              checked={v.multi ?? false}
              onChange={(e) => updateVariable(v.id, {multi: e.target.checked})}
            />
            <label htmlFor={`multi-${v.id}`} className="text-[10px]">Multi-select</label>
            {v.multi && (
              <>
                <input
                  type="checkbox"
                  id={`all-${v.id}`}
                  checked={v.includeAll ?? false}
                  onChange={(e) => updateVariable(v.id, {includeAll: e.target.checked})}
                />
                <label htmlFor={`all-${v.id}`} className="text-[10px]">Include All</label>
              </>
            )}
          </div>

          <div className="text-[10px] text-muted-foreground">
            Current: {String(variableValues[v.name] ?? v.current?.value ?? "—")}
          </div>
        </div>
      ))}
    </div>
  );
}
