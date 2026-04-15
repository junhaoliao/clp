import {z} from "zod";

import {stringSchema} from "./common.js";


const prestoQueryJobCreationSchema = z.object({
    queryString: stringSchema,
});

const prestoQueryJobSchema = z.object({
    searchJobId: stringSchema,
});

type PrestoQueryJobCreation = z.infer<typeof prestoQueryJobCreationSchema>;

type PrestoQueryJob = z.infer<typeof prestoQueryJobSchema>;

export {
    prestoQueryJobCreationSchema,
    prestoQueryJobSchema,
};
export type {
    PrestoQueryJob,
    PrestoQueryJobCreation,
};
