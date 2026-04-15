import type {Db} from "mongodb";

import type {CompressionJobDbManager} from "./services/compression-job-db-manager.js";
import type {PrestoClient} from "./services/presto-client.js";
import type {QueryJobDbManager} from "./services/query-job-db-manager.js";
import type {S3Manager} from "./services/s3-manager.js";
import type {StreamFileManager} from "./services/stream-file-manager.js";


type Env = {
    Variables: {
        queryJobDbManager: QueryJobDbManager;
        compressionJobDbManager: CompressionJobDbManager;
        streamFileManager: StreamFileManager;
        s3Manager: S3Manager | null;
        prestoClient: PrestoClient | null;
        mongoDb: Db;
    };
};

export type {Env};
