import {toMySQLDatetime} from "./datetime-utils.js";


export interface SchemaRecord {
    id: string;
    name: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface SchemaStorage {
    list(): Promise<SchemaRecord[]>;
    get(id: string): Promise<SchemaRecord | null>;
    create(schema: SchemaRecord): Promise<void>;
    update(id: string, schema: Partial<SchemaRecord>): Promise<SchemaRecord | null>;
    delete(id: string): Promise<boolean>;
}

export class InMemorySchemaStorage implements SchemaStorage {
    private store = new Map<string, SchemaRecord>();

    async list (): Promise<SchemaRecord[]> {
        return Array.from(this.store.values());
    }

    async get (id: string): Promise<SchemaRecord | null> {
        return this.store.get(id) ?? null;
    }

    async create (schema: SchemaRecord): Promise<void> {
        this.store.set(schema.id, schema);
    }

    async update (id: string, schema: Partial<SchemaRecord>): Promise<SchemaRecord | null> {
        const existing = this.store.get(id);
        if (!existing) {
            return null;
        }
        const updated: SchemaRecord = {
            ...existing,
            ...schema,
            updatedAt: toMySQLDatetime(),
        };

        this.store.set(id, updated);

        return updated;
    }

    async delete (id: string): Promise<boolean> {
        return this.store.delete(id);
    }
}
