/**
 * Typed RPC client setup.
 *
 * Usage in client code:
 *   import {hc} from "hono/client";
 *   import type {AppType} from "@webui/server/hono-app";
 *   const client = hc<AppType>("/");
 *
 * Pre-compiled hcWithType pattern for IDE performance:
 *   export const hcWithType = () => client;
 */
