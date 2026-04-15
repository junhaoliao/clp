import {QUERY_JOB_TYPE} from "@clp/webui-shared";
import {encode} from "@msgpack/msgpack";
import type {Pool} from "mysql2/promise";

import {
    QUERY_JOB_STATUS,
    QUERY_JOB_STATUS_WAITING_STATES,
} from "../typings/query.js";


const JOB_COMPLETION_STATUS_POLL_INTERVAL_MILLIS = 500;

class QueryJobDbManager {
    #pool: Pool;

    #tableName: string;

    constructor (pool: Pool, tableName: string) {
        this.#pool = pool;
        this.#tableName = tableName;
    }

    async submitJob (jobConfig: object, jobType: QUERY_JOB_TYPE): Promise<number> {
        const encodedConfig = Buffer.from(encode(jobConfig));
        const [result] = await this.#pool.execute(
            `INSERT INTO \`${this.#tableName}\` (\`type\`, \`job_config\`) VALUES (?, ?)`,
            [jobType,
                encodedConfig],
        );
        const insertResult = result as {insertId: number};
        return insertResult.insertId;
    }

    async cancelJob (jobId: number): Promise<void> {
        const waitingStatesArray = [...QUERY_JOB_STATUS_WAITING_STATES];
        const placeholders = waitingStatesArray.map(() => "?").join(",");
        await this.#pool.execute(
            `UPDATE \`${this.#tableName}\` SET \`status\` = ? WHERE \`id\` = ? AND \`status\` IN (${placeholders})`,
            [QUERY_JOB_STATUS.CANCELLING,
                jobId,
                ...waitingStatesArray],
        );
    }

    async getJobStatus (jobId: number): Promise<QUERY_JOB_STATUS | null> {
        const [rows] = await this.#pool.execute(
            `SELECT \`status\` FROM \`${this.#tableName}\` WHERE \`id\` = ?`,
            [jobId],
        );
        const resultRows = rows as Array<{status: QUERY_JOB_STATUS}>;
        if (0 === resultRows.length) {
            return null;
        }

        return resultRows[0].status;
    }

    async awaitJobCompletion (jobId: number): Promise<QUERY_JOB_STATUS> {
        let status = await this.getJobStatus(jobId);
        while (null !== status && QUERY_JOB_STATUS_WAITING_STATES.has(status)) {
            await new Promise((resolve) => {
                setTimeout(resolve, JOB_COMPLETION_STATUS_POLL_INTERVAL_MILLIS);
            });
            status = await this.getJobStatus(jobId);
        }

        if (null === status) {
            throw new Error(`Query job ${jobId} not found`);
        }

        return status;
    }

    async submitAndWaitForJob (
        jobConfig: object,
        jobType: QUERY_JOB_TYPE,
    ): Promise<{jobId: number; status: QUERY_JOB_STATUS}> {
        const jobId = await this.submitJob(jobConfig, jobType);
        const status = await this.awaitJobCompletion(jobId);
        return {jobId, status};
    }
}

export {QueryJobDbManager};
