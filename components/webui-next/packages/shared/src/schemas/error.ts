import {z} from "zod";


const errorSchema = z.object({
    message: z.string(),
});

export {errorSchema};
