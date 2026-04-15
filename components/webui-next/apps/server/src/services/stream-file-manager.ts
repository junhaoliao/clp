import {QUERY_JOB_TYPE} from "@clp/webui-shared";
import type {Collection} from "mongodb";

import type {StreamFileMetadata} from "../typings/stream-files.js";
import type {QueryJobDbManager} from "./query-job-db-manager.js";


class StreamFileManager {
    #queryJobDbManager: QueryJobDbManager;

    #streamFilesCollection: Collection<StreamFileMetadata>;

    constructor (
        queryJobDbManager: QueryJobDbManager,
        streamFilesCollection: Collection<StreamFileMetadata>,
    ) {
        this.#queryJobDbManager = queryJobDbManager;
        this.#streamFilesCollection = streamFilesCollection;
    }

    async submitAndWaitForExtractStreamJob (
        streamId: string,
        logEventIdx: number,
        extractJobType: QUERY_JOB_TYPE,
        dataset: string | null,
    ): Promise<number | null> {
        const jobConfig: Record<string, unknown> = {
            dataset: dataset,
            log_event_idx: logEventIdx,
            stream_id: streamId,
        };

        try {
            const {jobId} = await this.#queryJobDbManager.submitAndWaitForJob(
                jobConfig,
                extractJobType,
            );

            return jobId;
        } catch {
            return null;
        }
    }

    async getExtractedStreamFileMetadata (
        streamId: string,
        logEventIdx: number,
    ): Promise<StreamFileMetadata | null> {
        const doc = await this.#streamFilesCollection.findOne({
            stream_id: streamId,
            begin_msg_ix: {$lte: logEventIdx},
            end_msg_ix: {$gt: logEventIdx},
        });

        return doc;
    }
}

export {StreamFileManager};
