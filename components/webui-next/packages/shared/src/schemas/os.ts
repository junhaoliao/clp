import {z} from "zod";

import {stringSchema} from "./common.js";


const sqlSchema = z.object({
    queryString: stringSchema,
});

export {sqlSchema};
