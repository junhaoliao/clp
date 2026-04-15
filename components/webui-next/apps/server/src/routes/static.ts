import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {serveStatic} from "@hono/node-server/serve-static";
import {Hono} from "hono";

import settings from "../../settings.json" with {type: "json"};
import type {Env} from "../env.js";


// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url));


/**
 *
 * @param p
 */
function resolvePath (p: string): string {
    if (path.isAbsolute(p)) {
        return p;
    }

    // __dirname = apps/server/src/routes/ (or apps/server/dist/routes/ when compiled)
    // go up 3 levels to reach apps/server/, then resolve the relative path
    return path.resolve(__dirname, "../../", p);
}

let clientDir = resolvePath(settings.ClientDir);

// Prefer the built dist/ directory over the source template
const distDir = path.join(clientDir, "dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
    clientDir = distDir;
}

// Static file serving routes — must be mounted last
const staticRoutes = new Hono<Env>();

// Stream files
if (settings.StreamFilesDir) {
    staticRoutes.use("/streams/*", serveStatic({
        root: resolvePath(settings.StreamFilesDir),
        rewriteRequestPath: (p) => p.replace(/^\/streams/, ""),
    }));
}

// Log viewer
staticRoutes.use("/log-viewer/*", serveStatic({
    root: resolvePath(settings.LogViewerDir),
    rewriteRequestPath: (p) => p.replace(/^\/log-viewer/, ""),
}));

// Client static assets (JS, CSS, etc.)
staticRoutes.use("/*", serveStatic({
    root: clientDir,
}));

// SPA fallback: serve index.html for any unmatched route (for client-side routing)
staticRoutes.get("*", (c) => {
    const indexPath = path.join(clientDir, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");

    return c.html(content);
});

export {staticRoutes};
