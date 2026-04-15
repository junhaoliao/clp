import {z} from "zod";

import {QUERY_JOB_TYPE} from "../query.js";
import {stringSchema} from "./common.js";


const streamFileExtractionSchema = z.object({
    dataset: z.string().nullable(),
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    extractJobType: z.nativeEnum(QUERY_JOB_TYPE),
    logEventIdx: z.number().int(),
    streamId: stringSchema,
});

export {streamFileExtractionSchema};
