import {z} from "zod";

import {stringSchema} from "./common.js";


const fileEntrySchema = z.object({
    isExpandable: z.boolean(),
    name: stringSchema,
    parentPath: stringSchema,
});

type FileEntry = z.infer<typeof fileEntrySchema>;

const fileListRequestSchema = z.object({
    path: z.string().default("/"),
});

const fileListSchema = z.array(fileEntrySchema);

type FileListing = z.infer<typeof fileListSchema>;

export {
    fileEntrySchema,
    fileListRequestSchema,
    fileListSchema,
};
export type {
    FileEntry,
    FileListing,
};
