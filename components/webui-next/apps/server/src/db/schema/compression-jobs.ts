import {
    bigint,
    datetime,
    float,
    int,
    mysqlTable,
    varbinary,
    varchar,
} from "drizzle-orm/mysql-core";


export const compressionJobs = mysqlTable("compression_jobs", {
    id: int("id").autoincrement()
        .primaryKey(),
    status: int("status").notNull()
        .default(0),
    statusMsg: varchar("status_msg", {length: 512}).notNull(),
    creationTime: datetime("creation_time", {fsp: 3}).notNull(),
    startTime: datetime("start_time", {fsp: 3}),
    updateTime: datetime("update_time").notNull(),
    duration: float("duration"),
    originalSize: bigint("original_size", {mode: "number"}).notNull()
        .default(0),
    uncompressedSize: bigint("uncompressed_size", {mode: "number"}).notNull()
        .default(0),
    compressedSize: bigint("compressed_size", {mode: "number"}).notNull()
        .default(0),
    numTasks: int("num_tasks").notNull()
        .default(0),
    numTasksCompleted: int("num_tasks_completed").notNull()
        .default(0),
    clpBinaryVersion: int("clp_binary_version"),
    clpConfig: varbinary("clp_config", {length: 60000}).notNull(),
});
