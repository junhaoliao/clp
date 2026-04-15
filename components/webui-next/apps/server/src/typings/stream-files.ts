import {z} from "zod";


const streamFileMetadataSchema = z.object({
    begin_msg_ix: z.number().int(),
    end_msg_ix: z.number().int(),
    is_last_chunk: z.boolean(),
    path: z.string(),
    stream_id: z.string(),
});

type StreamFileMetadata = z.infer<typeof streamFileMetadataSchema>;

export {streamFileMetadataSchema};
export type {StreamFileMetadata};
