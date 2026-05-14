import type {InfinityAuth} from "../types.js";


const AUTH_TYPE_BASIC = "basic";
const AUTH_TYPE_APIKEY = "apikey";
const AUTH_TYPE_NONE = "none";

/**
 * Build HTTP headers from an InfinityAuth config.
 *
 * @param auth
 */
export function buildAuthHeaders (auth: InfinityAuth | undefined): Record<string, string> {
    if (!auth || auth.type === AUTH_TYPE_NONE) {
        return {};
    }

    if (auth.type === AUTH_TYPE_BASIC) {
        const credentials = `${auth.username}:${auth.password}`;
        const encoded = ("undefined" !== typeof Buffer) ?
            Buffer.from(credentials).toString("base64") :
            btoa(credentials);

        return {Authorization: `Basic ${encoded}`};
    }

    if (auth.type === AUTH_TYPE_APIKEY) {
        return {[auth.key]: auth.value};
    }

    return {};
}
