import {drizzle} from "drizzle-orm/mysql2";
import {MongoClient} from "mongodb";
import mysql from "mysql2/promise";

import settings from "../../settings.json" with {type: "json"};
import * as schema from "./schema/index.js";


const pool = mysql.createPool({
    host: settings.SqlDbHost,
    port: settings.SqlDbPort,
    user: process.env.CLP_DB_USER,
    password: process.env.CLP_DB_PASS,
    database: settings.SqlDbName,
});

export const db = drizzle(pool, {mode: "default", schema: schema});

const mongoUrl = `mongodb://${settings.MongoDbHost}:${settings.MongoDbPort}` +
    `/${settings.MongoDbName}?directConnection=true`;
const mongoClient = new MongoClient(mongoUrl);
let mongoDb: Awaited<ReturnType<typeof mongoClient.db>> | null = null;

/**
 *
 */
async function connectMongo () {
    if (null === mongoDb) {
        await mongoClient.connect();
        mongoDb = mongoClient.db(settings.MongoDbName);
    }

    return mongoDb;
}

export {
    connectMongo, pool,
};
