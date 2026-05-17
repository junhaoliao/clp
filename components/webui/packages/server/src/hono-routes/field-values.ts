import {tbValidator} from "@hono/typebox-validator";
import {
    type TSchema,
    Type,
} from "@sinclair/typebox";
import {Hono} from "hono";


const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

const FieldValuesQuerySchema = Type.Object({
    dataset: Type.String({minLength: 1}),
    field: Type.String({minLength: 1}),
    limit: Type.Optional(Type.String()),
});


export const fieldValuesRoutes = new Hono()
    .get(
        "/",
        tbValidator("query", FieldValuesQuerySchema as unknown as TSchema),
        async (c) => {
            const raw = c.req.valid("query") as {
                dataset: string;
                field: string;
                limit?: string;
            };
            let limit = DEFAULT_LIMIT;
            if (undefined !== raw.limit) {
                const parsed = parseInt(raw.limit, 10);
                if (Number.isNaN(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
                    return c.json({error: `limit must be an integer between 1 and ${MAX_LIMIT}`}, 400);
                }
                limit = parsed;
            }

            // Field values extraction requires a C++ `stats.field_values` command
            // that does not yet exist. Search results store only the serialized
            // `message` string in MongoDB, not individual structured field values.
            // Returning empty results until the backend supports it.
            return c.json({
                dataset: raw.dataset,
                field: raw.field,
                limit: limit,
                values: [],
            });
        },
    );

export type FieldValuesRoutesType = typeof fieldValuesRoutes;
