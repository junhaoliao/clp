import {CLP_QUERY_ENGINES} from "@webui/common/config";
import type {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";
import mysql from "mysql2/promise";

import settings from "../../../settings.json" with {type: "json"};
import {honoApp} from "../../hono-app.js";
import {setClpQueryService} from "../../hono-routes/clp-query-service.js";
import {setDashboardStorage} from "../../hono-routes/dashboards.js";
import {setDatasourceStorage} from "../../hono-routes/datasource.js";
import {
    DASHBOARD_MIGRATION,
    MySQLDashboardStorage,
} from "../../storage/dashboard-storage.js";
import {
    DATASOURCE_MIGRATION,
    MySQLDatasourceStorage,
} from "../../storage/datasource-storage.js";
import {provisionDatasources} from "../../storage/provisioning.js";


const HONO_DELEGATED_ROUTES = [
    "/api/dashboards",
    "/api/dashboards/*",
    "/api/datasource",
    "/api/datasource/*",
    "/api/logtype-stats",
    "/api/logtype-stats/*",
    "/api/schema-tree",
    "/api/schema-tree/*",
    "/api/schemas",
    "/api/schemas/*",
];

/**
 * Streams an SSE response through the Fastify raw response.
 *
 * @param reply
 * @param res
 */
const streamSSEResponse = async (reply: FastifyReply, res: Response) => {
    reply.raw.writeHead(res.status, Object.fromEntries(res.headers.entries()));
    const reader = res.body?.getReader();
    if (!reader) {
        reply.raw.end();

        return;
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
            const {done, value} = await reader.read();
            if (done) {
                break;
            }
            reply.raw.write(value);
        }
    } finally {
        reply.raw.end();
    }
};

/**
 * Initializes MySQL storage for dashboard/datasource persistence and runs migrations.
 *
 * @param mysqlConfig
 * @param getMySQLConnection
 */
const initMySQLStorage = async (
    mysqlConfig: mysql.ConnectionOptions,
    getMySQLConnection: () => Promise<mysql.Connection>,
) => {
    const conn = await mysql.createConnection(mysqlConfig);
    try {
        await conn.query(DASHBOARD_MIGRATION);
        await conn.query(DATASOURCE_MIGRATION);
    } finally {
        await conn.end();
    }
    setDashboardStorage(new MySQLDashboardStorage(getMySQLConnection));
    setDatasourceStorage(new MySQLDatasourceStorage(getMySQLConnection));
    await provisionDatasources(new MySQLDatasourceStorage(getMySQLConnection));
};

/**
 * Wires the CLP query service (QueryJobDbManager + MongoDB) for datasource routes.
 *
 * @param fastify
 * @throws {Error} If MongoDB database is not found
 */
const initClpQueryService = (fastify: FastifyInstance) => {
    const mongoDb = fastify.mongo.db;
    if ("undefined" === typeof mongoDb) {
        throw new Error("MongoDB database not found");
    }
    setClpQueryService({
        metadataCollectionName: settings.MongoDbSearchResultsMetadataCollectionName,
        mongoDb: mongoDb,
        queryEngine: settings.ClpQueryEngine as CLP_QUERY_ENGINES,
        queryJobDbManager: fastify.QueryJobDbManager,
    });
};

/**
 * Delegates /api/dashboards/*, /api/datasource/*, and CLPP API requests to the Hono app.
 * Same-port coexistence: Fastify is the primary server, Hono handles specific routes.
 *
 * @param fastify
 */
const honoDelegation = async (fastify: FastifyInstance) => {
    const {CLP_DB_USER, CLP_DB_PASS} = fastify.config;
    const mysqlConfig = {
        database: settings.SqlDbName,
        host: settings.SqlDbHost,
        password: CLP_DB_PASS,
        port: settings.SqlDbPort,
        user: CLP_DB_USER,
    };

    const getMySQLConnection = () => mysql.createConnection(mysqlConfig);
    await initMySQLStorage(mysqlConfig, getMySQLConnection);
    initClpQueryService(fastify);

    const honoFetch = honoApp.fetch;

    const delegateToHono = async (request: FastifyRequest, reply: FastifyReply) => {
        let urlPath = request.url;
        if (urlPath.endsWith("/") && 0 < urlPath.split("/").filter(Boolean).length) {
            const basePath = urlPath.replace(/\/+$/, "");
            if ("/api/dashboards" === basePath || "/api/datasource" === basePath) {
                urlPath = basePath;
            }
        }

        const url = `${request.protocol}://${request.hostname}${urlPath}`;
        const init: RequestInit = {
            headers: Object.entries(request.headers)
                .filter(([, v]) => "undefined" !== typeof v) as [string, string][],
            method: request.method,
        };

        if (request.body) {
            init.body = JSON.stringify(request.body);
        }

        const webReq = new Request(url, init);
        const res = await honoFetch(webReq);
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("text/event-stream")) {
            await streamSSEResponse(reply, res);

            return;
        }

        reply.code(res.status);
        for (const [key, value] of res.headers.entries()) {
            reply.header(key, value);
        }
        reply.send(await res.text());
    };

    for (const route of HONO_DELEGATED_ROUTES) {
        fastify.all(route, delegateToHono);
    }
};

export default fp(honoDelegation, {name: "hono-delegation"});
