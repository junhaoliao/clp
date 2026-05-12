import type {ComponentType} from "react";
import type {PanelType, GridPos, Annotation} from "@webui/common/dashboard/types";

export interface PanelPluginMeta {
  type: PanelType;
  name: string;
  icon: string;
  description: string;
  defaultGridPos: Partial<GridPos>;
  minGridPos: Partial<GridPos>;
  supportsMultiQuery?: boolean;
  isTimeAware?: boolean;
}

export interface PanelComponentProps {
  id: string;
  data: {name: string; fields: {name: string; type: string; values: unknown[]; config?: {displayName?: string; unit?: string; decimals?: number; filterable?: boolean}}[]; length: number}[];
  options: Record<string, unknown>;
  fieldConfig?: unknown;
  timeRange: {from: number; to: number; raw: {from: string; to: string}};
  width: number;
  height: number;
  transparent: boolean;
  replaceVariables: (str: string) => string;
  onOptionsChange: (options: unknown) => void;
  onTimeRangeChange?: (from: number, to: number) => void;
  annotations?: Annotation[] | undefined;
  syncId?: string;
}

export interface PanelOptionsBuilder {
  addSelect: (key: string, opts: {label: string; options: string[]; defaultValue?: string}) => PanelOptionsBuilder;
  addNumberInput: (key: string, opts: {label: string; min?: number; max?: number; defaultValue?: number}) => PanelOptionsBuilder;
  addToggle: (key: string, opts: {label: string; defaultValue?: boolean}) => PanelOptionsBuilder;
  addColorPicker: (key: string, opts: {label: string}) => PanelOptionsBuilder;
  build: () => Map<string, unknown>;
}

export interface PanelPlugin {
  meta: PanelPluginMeta;
  component: ComponentType<PanelComponentProps>;
  optionsBuilder?: () => PanelOptionsBuilder;
  queryEditor?: ComponentType<unknown>;
  defaultOptions?: () => Record<string, unknown>;
  migrationHandler?: (oldVersion: number, options: unknown) => unknown;
}

/** Panel plugin registry */
const panelPlugins = new Map<PanelType, PanelPlugin>();

export function registerPanelPlugin(plugin: PanelPlugin): void {
  panelPlugins.set(plugin.meta.type, plugin);
}

export function getPanelPlugin(type: PanelType): PanelPlugin | undefined {
  return panelPlugins.get(type);
}

export function getAllPanelPlugins(): PanelPlugin[] {
  return Array.from(panelPlugins.values());
}

/** Options builder implementation */
class PanelOptionsBuilderImpl implements PanelOptionsBuilder {
  private options = new Map<string, unknown>();

  addSelect(key: string, opts: {label: string; options: string[]; defaultValue?: string}): PanelOptionsBuilder {
    this.options.set(key, opts.defaultValue ?? opts.options[0] ?? "");
    return this;
  }
  addNumberInput(key: string, opts: {label: string; min?: number; max?: number; defaultValue?: number}): PanelOptionsBuilder {
    this.options.set(key, opts.defaultValue ?? 0);
    return this;
  }
  addToggle(key: string, opts: {label: string; defaultValue?: boolean}): PanelOptionsBuilder {
    this.options.set(key, opts.defaultValue ?? false);
    return this;
  }
  addColorPicker(key: string, _opts: {label: string}): PanelOptionsBuilder {
    this.options.set(key, "#000000");
    return this;
  }
  build(): Map<string, unknown> {
    return new Map(this.options);
  }
}

export function createOptionsBuilder(): PanelOptionsBuilder {
  return new PanelOptionsBuilderImpl();
}
