import type {AppType} from "@clp/webui-server/routes";
import {hc} from "hono/client";


/**
 * Hono RPC client instance. Uses the server's `AppType` for end-to-end type safety.
 */
const api = hc<AppType>("/");


export {api};
