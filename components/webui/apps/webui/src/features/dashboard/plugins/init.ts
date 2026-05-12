import {registerPanelPlugin} from "./registry";
import {builtinPlugins} from "../panels/builtin";

let initialized = false;

export function initializePanelPlugins(): void {
  if (initialized) return;
  for (const plugin of builtinPlugins) {
    registerPanelPlugin(plugin);
  }
  initialized = true;
}
