import {z} from "zod";


const stringSchema = z.string().min(1);

const idSchema = z.number().int()
    .min(1);

export {
    idSchema,
    stringSchema,
};
