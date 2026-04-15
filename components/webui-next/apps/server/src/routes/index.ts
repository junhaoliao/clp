import {OpenAPIHono} from "@hono/zod-openapi";

import type {Env} from "../env.js";
import {archiveMetadataRoutes} from "./archive-metadata.js";
import {compressRoutes} from "./compress.js";
import {compressMetadataRoutes} from "./compress-metadata.js";
import {osRoutes} from "./os.js";
import {searchRoutes} from "./search.js";
import {staticRoutes} from "./static.js";
import {streamFilesRoutes} from "./stream-files.js";


// Presto search routes are conditionally included based on config
let prestoSearchModule: typeof import("./presto-search.js") | null = null;
try {
    prestoSearchModule = await import("./presto-search.js");
} catch {
    // Presto not available
}

const routes = new OpenAPIHono<Env>()
    .route("/api/search", searchRoutes)
    .route("/api/compress", compressRoutes)
    .route("/api/compress-metadata", compressMetadataRoutes)
    .route("/api/archive-metadata", archiveMetadataRoutes)
    .route("/api/os", osRoutes)
    .route("/api/stream-files", streamFilesRoutes);

if (prestoSearchModule) {
    routes.route("/api/presto-search", prestoSearchModule.prestoSearchRoutes);
}

// Static serving must be last (catch-all)
routes.route("/", staticRoutes);

export type AppType = typeof routes;
export default routes;
