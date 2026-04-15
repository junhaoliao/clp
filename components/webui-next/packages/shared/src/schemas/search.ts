import {z} from "zod";

import {
    idSchema,
    stringSchema,
} from "./common.js";


const queryJobCreationSchema = z.object({
    datasets: z.array(z.string()),
    ignoreCase: z.boolean(),
    queryString: stringSchema,
    timeRangeBucketSizeMillis: z.number().int(),
    timestampBegin: z.number().int()
        .nullable(),
    timestampEnd: z.number().int()
        .nullable(),
});

const queryJobSchema = z.object({
    searchJobId: idSchema,
    aggregationJobId: idSchema,
});

type QueryJobCreation = z.infer<typeof queryJobCreationSchema>;

type QueryJob = z.infer<typeof queryJobSchema>;

export {
    queryJobCreationSchema,
    queryJobSchema,
};
export type {
    QueryJob,
    QueryJobCreation,
};
