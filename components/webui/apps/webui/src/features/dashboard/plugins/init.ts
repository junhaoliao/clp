import {builtinPlugins} from "../panels/builtin";
import {registerPanelPlugin} from "./registry";


let initialized = false;

/**
 *
 */
export function initializePanelPlugins (): void {
    if (initialized) {
        return;
    }
    for (const plugin of builtinPlugins) {
        registerPanelPlugin(plugin);
    }
    initialized = true;
}
