import type {FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply} from "fastify";
import {CLP_QUERY_ENGINES} from "@webui/common/config";
import fp from "fastify-plugin";
import mysql from "mysql2/promise";
import {honoApp} from "../../hono-app.js";
import {setDashboardStorage} from "../../hono-routes/dashboards.js";
import {MySQLDashboardStorage, DASHBOARD_MIGRATION} from "../../storage/dashboard-storage.js";
import {setClpQueryService} from "../../hono-routes/clp-query-service.js";
import {setDatasourceStorage} from "../../hono-routes/datasource.js";
import {MySQLDatasourceStorage, DATASOURCE_MIGRATION} from "../../storage/datasource-storage.js";
import {provisionDatasources} from "../../storage/provisioning.js";
import settings from "../../../settings.json" with {type: "json"};

/**
 * Delegates /api/dashboards/* and /api/datasource/* requests to the Hono app.
 * Same-port coexistence: Fastify is the primary server, Hono handles dashboard routes.
 * Also wires MySQL storage for dashboard/datasource persistence and runs migrations.
 */
async function honoDelegation(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Wire MySQL storage for persistence
  const {CLP_DB_USER, CLP_DB_PASS} = fastify.config;
  const mysqlConfig = {
    host: settings.SqlDbHost,
    port: settings.SqlDbPort,
    user: CLP_DB_USER,
    password: CLP_DB_PASS,
    database: settings.SqlDbName,
  };

  const getMySQLConnection = () => mysql.createConnection(mysqlConfig);

  // Run migrations
  const conn = await mysql.createConnection(mysqlConfig);
  try {
    await conn.query(DASHBOARD_MIGRATION);
    await conn.query(DATASOURCE_MIGRATION);
  } finally {
    await conn.end();
  }

  // Set MySQL storage backends
  setDashboardStorage(new MySQLDashboardStorage(getMySQLConnection));
  setDatasourceStorage(new MySQLDatasourceStorage(getMySQLConnection));

  // Provision default datasources on first startup
  await provisionDatasources(new MySQLDatasourceStorage(getMySQLConnection));

  // Wire CLP query service (QueryJobDbManager + MongoDB) for dashboard datasource routes
  const mongoDb = fastify.mongo.db;
  if ("undefined" === typeof mongoDb) {
    throw new Error("MongoDB database not found");
  }
  setClpQueryService({
    queryJobDbManager: fastify.QueryJobDbManager,
    mongoDb,
    queryEngine: settings.ClpQueryEngine as CLP_QUERY_ENGINES,
    metadataCollectionName: settings.MongoDbSearchResultsMetadataCollectionName,
  });

  const honoFetch = honoApp.fetch;

  const delegateToHono = async (request: FastifyRequest, reply: FastifyReply) => {
    let urlPath = request.url;
    // Normalize trailing slash so Hono matches root routes on mounted sub-paths
    if (urlPath.endsWith("/") && urlPath.split("/").filter(Boolean).length > 0) {
      const basePath = urlPath.replace(/\/+$/, "");
      if (basePath === "/api/dashboards" || basePath === "/api/datasource") {
        urlPath = basePath;
      }
    }
    const url = `${request.protocol}://${request.hostname}${urlPath}`;
    const init: RequestInit = {
      method: request.method,
      headers: Object.entries(request.headers).filter(([, v]) => v !== undefined) as [string, string][],
    };
    if (request.body) {
      init.body = JSON.stringify(request.body);
    }
    const webReq = new Request(url, init);
    const res = await honoFetch(webReq);

    // Check if the response is SSE (streaming)
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      // Stream SSE responses properly through Fastify
      reply.raw.writeHead(res.status, Object.fromEntries(res.headers.entries()));
      const reader = res.body?.getReader();
      if (reader) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            reply.raw.write(value);
          }
        } finally {
          reply.raw.end();
        }
      }

      return;
    }

    reply.code(res.status);
    for (const [key, value] of res.headers.entries()) {
      reply.header(key, value);
    }
    return res.text();
  };

  fastify.all("/api/dashboards", delegateToHono);
  fastify.all("/api/dashboards/*", delegateToHono);
  fastify.all("/api/datasource", delegateToHono);
  fastify.all("/api/datasource/*", delegateToHono);
}

export default fp(honoDelegation, {name: "hono-delegation"});
