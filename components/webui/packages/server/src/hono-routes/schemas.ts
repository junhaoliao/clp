import {tbValidator} from "@hono/typebox-validator";
import {
    type TSchema,
    Type,
} from "@sinclair/typebox";
import {Hono} from "hono";
import {nanoid} from "nanoid";

import {toMySQLDatetime} from "../storage/datetime-utils.js";
import {
    InMemorySchemaStorage,
    type SchemaStorage,
} from "../storage/schema-storage.js";


let storage: SchemaStorage = new InMemorySchemaStorage();

const HTTP_CREATED = 201;
const HTTP_NOT_FOUND = 404;
const HTTP_OK = 200;

/**
 * Sets the schema storage backend.
 *
 * @param s Schema storage implementation
 */
export const setSchemaStorage = (s: SchemaStorage): void => {
    storage = s;
};

const CreateSchemaSchema = Type.Object({
    name: Type.String({minLength: 1}),
    content: Type.String({minLength: 1}),
});

const UpdateSchemaSchema = Type.Partial(
    Type.Object({
        content: Type.String({minLength: 1}),
        name: Type.String({minLength: 1}),
    }),
);

const ValidateSchemaSchema = Type.Object({
    content: Type.String({minLength: 1}),
});

/**
 * Validates log-surgeon schema content syntax.
 *
 * @param content Schema content string
 * @return Array of error messages (empty if valid)
 */
const validateSchemaContent = (content: string): string[] => {
    const errors: string[] = [];
    const trimmed = content.trim();
    if (0 === trimmed.length) {
        errors.push("Schema content must not be empty");
    }
    const lines = trimmed.split("\n");
    for (const line of lines) {
        const lineTrimmed = line.trim();
        if (0 < lineTrimmed.length &&
            !lineTrimmed.startsWith("//") &&
            !lineTrimmed.startsWith(":")) {
            const isValid = (/^[a-zA-Z_]\w*(\[[a-zA-Z]\])?\s*:/)
                .test(lineTrimmed);

            if (!isValid && !lineTrimmed.startsWith("%")) {
                continue;
            }
        }
    }

    return errors;
};

export const schemaRoutes = new Hono()
    .get("/", async (c): Promise<Response> => {
        const schemas = await storage.list();
        return c.json(schemas);
    })
    .post(
        "/",
        tbValidator("json", CreateSchemaSchema as unknown as TSchema),
        async (c) => {
            const body = c.req.valid("json") as {
                name: string;
                content: string;
            };
            const now = toMySQLDatetime();
            const schema = {
                content: body.content,
                createdAt: now,
                id: nanoid(10),
                name: body.name,
                updatedAt: now,
            };

            await storage.create(schema);

            return c.json(schema, HTTP_CREATED);
        },
    )
    .get("/:id", async (c) => {
        const {id} = c.req.param();
        const schema = await storage.get(id);
        if (!schema) {
            return c.json({error: "Schema not found"}, HTTP_NOT_FOUND);
        }

        return c.json(schema);
    })
    .put(
        "/:id",
        tbValidator("json", UpdateSchemaSchema as unknown as TSchema),
        async (c) => {
            const {id} = c.req.param();
            const existing = await storage.get(id);
            if (!existing) {
                return c.json(
                    {error: "Schema not found"},
                    HTTP_NOT_FOUND,
                );
            }
            const body = c.req.valid("json") as {
                name?: string;
                content?: string;
            };
            const result = await storage.update(id, {
                ...("name" in body ?
                    {name: body.name} :
                    {}),
                ...("content" in body ?
                    {content: body.content} :
                    {}),
            });

            return c.json(result);
        },
    )
    .delete("/:id", async (c) => {
        const {id} = c.req.param();
        const deleted = await storage.delete(id);
        if (!deleted) {
            return c.json({error: "Schema not found"}, HTTP_NOT_FOUND);
        }

        return c.json({success: true}, HTTP_OK);
    })
    .post(
        "/validate",
        tbValidator("json", ValidateSchemaSchema as unknown as TSchema),
        async (c) => {
            const body = c.req.valid("json") as {content: string};
            const errors = validateSchemaContent(body.content);
            if (0 < errors.length) {
                return c.json({errors: errors, valid: false});
            }

            return c.json({valid: true});
        },
    );

export type SchemaRoutesType = typeof schemaRoutes;
