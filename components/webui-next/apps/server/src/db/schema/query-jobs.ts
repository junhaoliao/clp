import {
    datetime,
    float,
    int,
    mysqlTable,
    varbinary,
} from "drizzle-orm/mysql-core";


export const queryJobs = mysqlTable("query_jobs", {
    id: int("id").autoincrement()
        .primaryKey(),
    type: int("type").notNull(),
    status: int("status").notNull()
        .default(0),
    creationTime: datetime("creation_time", {fsp: 3}).notNull(),
    numTasks: int("num_tasks").notNull()
        .default(0),
    numTasksCompleted: int("num_tasks_completed").notNull()
        .default(0),
    startTime: datetime("start_time", {fsp: 3}),
    duration: float("duration"),
    jobConfig: varbinary("job_config", {length: 60000}).notNull(),
});
