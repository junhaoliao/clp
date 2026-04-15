import {existsSync} from "node:fs";
import {resolve} from "node:path";

import dotenv from "dotenv";


// Load env vars BEFORE any other imports (ESM hoists static imports,
// so we must use dynamic imports after dotenv loads to ensure env vars
// are available when db/index.ts creates the MySQL pool at module load time).
dotenv.config();
const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
    dotenv.config({path: envLocalPath, override: true});
}

const HOST = process.env.HOST ?? "localhost";
const DEFAULT_PORT = 3000;

const PORT = Number(process.env.PORT ?? DEFAULT_PORT);

/**
 *
 */
async function main () {
    const [{serve},
        {createApp},
        {initMongoSocketIoServer}] = await Promise.all([
        import("@hono/node-server"),
        import("./app.js"),
        import("./services/mongo-socket-io-server/index.js"),
    ]);

    const {app, mongoDb} = await createApp();

    const server = serve({
        fetch: app.fetch,
        port: PORT,
        hostname: HOST,
    });

    // Attach Socket.IO to the same HTTP server
    initMongoSocketIoServer(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        server as any,
        mongoDb,
    );

    console.log(`Server listening on http://${HOST}:${PORT}`);
}

main().catch((error: unknown) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
