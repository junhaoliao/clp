#!/usr/bin/env node
/**
 * Standalone Hono server for CLPP API routes (mock data).
 * This bypasses the full Fastify server (which needs MySQL/MongoDB)
 * so the Vite dev server proxy can reach the CLPP Hono routes.
 */
import {serve} from "@hono/node-server";

import {honoApp} from "./dist/src/hono-app.js";


serve({
    fetch: honoApp.fetch,
    port: 3000,
}, (info) => {
    console.log(`CLPP mock API server listening on http://localhost:${info.port}`);
});
