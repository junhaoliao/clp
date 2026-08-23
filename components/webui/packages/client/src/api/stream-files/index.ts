import type {components} from "@webui/api-client";
import {QUERY_JOB_TYPE} from "@webui/common/query";
import {Nullable} from "@webui/common/utility-types";

import {apiClient} from "../search";
import {buildApiErrorMessage} from "../utils";


interface SubmitExtractStreamJobProps {
    dataset: Nullable<string>;
    extractJobType: QUERY_JOB_TYPE.EXTRACT_IR | QUERY_JOB_TYPE.EXTRACT_JSON;
    streamId: string;
    logEventIdx: number;
    onRequestStarted: () => void;
}

type StreamFileMetadata = components["schemas"]["StreamFileMetadata"];

/**
 * Maps the numeric [`QUERY_JOB_TYPE`] enum to the string enum expected by the api-server's
 * `ExtractJobType` schema.
 *
 * @param jobType
 * @return
 * @throws {Error} If an unsupported value reaches the runtime boundary.
 */
const mapExtractJobType = (
    jobType: QUERY_JOB_TYPE.EXTRACT_IR | QUERY_JOB_TYPE.EXTRACT_JSON
): "ExtractIr" | "ExtractJson" => {
    switch (jobType) {
        case QUERY_JOB_TYPE.EXTRACT_IR:
            return "ExtractIr";
        case QUERY_JOB_TYPE.EXTRACT_JSON:
            return "ExtractJson";
        default: {
            const unsupportedJobType: never = jobType;
            throw new Error(`Unsupported extract job type: ${String(unsupportedJobType)}`);
        }
    }
};

/**
 * Submits a job to extract the stream that contains a given log event. The stream is extracted
 * either as a CLP IR or a JSON Lines file.
 *
 * @param props
 * @param props.dataset
 * @param props.extractJobType
 * @param props.streamId
 * @param props.logEventIdx
 * @param props.onRequestStarted Called after the extraction request has been dispatched.
 * @return The API response.
 * @throws {Error} If the request fails or the API server returns an unexpected response.
 */
const submitExtractStreamJob = async ({
    dataset,
    extractJobType,
    streamId,
    logEventIdx,
    onRequestStarted,
}: SubmitExtractStreamJobProps): Promise<{data: StreamFileMetadata}> => {
    // eslint-disable-next-line new-cap
    const request = apiClient.POST("/stream_files/extract", {
        body: {
            dataset: dataset,
            extract_job_type: mapExtractJobType(extractJobType),
            log_event_idx: logEventIdx,
            stream_id: streamId,
        },
    });

    onRequestStarted();
    const {data, error, response} = await request;

    if ("undefined" === typeof data) {
        throw new Error(buildApiErrorMessage("Failed to extract stream file", error, response));
    }

    return {data};
};

export {
    mapExtractJobType,
    submitExtractStreamJob,
};
