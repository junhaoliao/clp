import {
    brotliCompressSync,
    brotliDecompressSync,
} from "node:zlib";

import type {ClpIoConfig} from "@clp/webui-shared";
import {
    decode,
    encode,
} from "@msgpack/msgpack";
import type {Pool} from "mysql2/promise";


class CompressionJobDbManager {
    #pool: Pool;

    #tableName: string;

    constructor (pool: Pool, tableName: string) {
        this.#pool = pool;
        this.#tableName = tableName;
    }

    static decodeJobConfig (jobConfig: Buffer): Record<string, unknown> {
        const decompressed = brotliDecompressSync(jobConfig);
        return decode(decompressed) as Record<string, unknown>;
    }

    async submitJob (jobConfig: ClpIoConfig): Promise<number> {
        const encodedConfig = Buffer.from(encode(jobConfig));
        const compressedConfig = brotliCompressSync(encodedConfig);
        const [result] = await this.#pool.execute(
            `INSERT INTO \`${this.#tableName}\` (\`clp_config\`) VALUES (?)`,
            [compressedConfig],
        );
        const insertResult = result as {insertId: number};
        return insertResult.insertId;
    }

    async getCompressionMetadata (): Promise<Array<Record<string, unknown>>> {
        const [rows] = await this.#pool.execute(
            "SELECT `id`, `status`, `status_msg`, `start_time`, `update_time`, " +
            "`duration`, `uncompressed_size`, `compressed_size`, `clp_config` " +
            `FROM \`${this.#tableName}\` ORDER BY \`id\` DESC LIMIT 1000`,
        );

        return rows as Array<Record<string, unknown>>;
    }
}

export {CompressionJobDbManager};
