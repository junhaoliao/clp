import type {
    LogEvent,
    SchemaTreeResponse,
} from "@/features/clpp/types";


type SchemaTreeNode = SchemaTreeResponse["tree"];

// Internal CLPP identifiers that should not appear as user-facing fields.
// Per design doc §9.2, log type IDs are NOT shown as field names.
const EXCLUDED_FIELD_KEYS = new Set(["log_type"]);

/**
 * Flattens a schema tree node into a list of dot-separated
 * field names, skipping object-type nodes.
 *
 * @param node
 * @param parentPath
 * @param isRoot
 * @return List of field name strings from the tree.
 */
const flattenFieldNames = (
    node: SchemaTreeNode,
    parentPath: string = "",
    isRoot: boolean = true,
): string[] => {
    const isSkippedKey = isRoot || !node.key;
    let path: string;
    if (isSkippedKey) {
        path = parentPath;
    } else if (parentPath) {
        path = `${parentPath}.${node.key}`;
    } else {
        path = node.key;
    }
    const names: string[] = [];

    if ("object" !== node.type && !EXCLUDED_FIELD_KEYS.has(node.key)) {
        names.push(path);
    }

    for (const child of node.children) {
        names.push(...flattenFieldNames(child, path, false));
    }

    return names;
};

/**
 * Recursively flattens a nested object into dot-notation key-value pairs.
 * e.g. {a: {b: 1, c: 2}} → {"a.b": 1, "a.c": 2}
 *
 * @param obj
 * @param prefix
 * @param result
 * @return Flattened object with dot-notation keys.
 */
const flattenObject = (
    obj: Record<string, unknown>,
    prefix = "",
    result: Record<string, unknown> = {},
): Record<string, unknown> => {
    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ?
            `${prefix}.${key}` :
            key;

        if (null !== value &&
            "object" === typeof value &&
            !Array.isArray(value)) {
            flattenObject(
                value as Record<string, unknown>,
                newKey,
                result,
            );
        } else {
            result[newKey] = value;
        }
    }

    return result;
};

/**
 * Converts a search result message to a body string.
 *
 * CLP-S search results encode the decompressed log event as
 * `{"message":"actual log text","timestamp":"..."}`. We extract the
 * inner `message` value so the Body column shows the log text
 * rather than the raw JSON envelope.
 *
 * @param message
 * @return Parsed body string.
 */
const parseBody = (message: string): string => {
    try {
        const parsed: unknown = JSON.parse(message);

        if ("string" === typeof parsed) {
            return parsed;
        }

        if (null !== parsed && "object" === typeof parsed) {
            const obj = parsed as Record<string, unknown>;
            if ("string" === typeof obj["message"]) {
                return obj["message"];
            }
        }

        return JSON.stringify(parsed);
    } catch {
        return message;
    }
};

type SearchResultItem = {
    _id: string;
    archive_id: string;
    dataset: string;
    log_event_ix: number;
    message: string;
    orig_file_id: string;
    orig_file_path: string;
    timestamp: number;
};

/**
 * Maps raw search results to LogEvent format.
 *
 * Parses the message JSON and flattens its structure into dot-notation
 * fields on each LogEvent, so dynamic columns from the schema tree
 * can access values via row.original[field].
 *
 * Built-in fields (timestamp, body, _id, etc.) are protected from
 * being overwritten by the spread — only keys that don't collide
 * with built-in names are applied.
 *
 * @param results
 * @return LogEvent array.
 */
const toLogEvents = (
    results: SearchResultItem[],
): LogEvent[] => results.map((r): LogEvent => {
    let parsedFields: Record<string, unknown> = {};

    try {
        const parsed: unknown = JSON.parse(r.message);
        if ("object" === typeof parsed && null !== parsed) {
            parsedFields = flattenObject(
                parsed as Record<string, unknown>,
            );
        }
    } catch {
        // Not valid JSON — skip field extraction
    }

    const base: Record<string, unknown> = {
        _id: r._id,
        archive_id: r.archive_id,
        body: parseBody(r.message),
        dataset: r.dataset,
        log_event_ix: r.log_event_ix,
        message: r.message,
        orig_file_id: r.orig_file_id,
        orig_file_path: r.orig_file_path,
        timestamp: r.timestamp,
    };

    for (const [key, value] of Object.entries(parsedFields)) {
        if (!(key in base)) {
            base[key] = value;
        }
    }

    return base as LogEvent;
});

export {
    flattenFieldNames,
    flattenObject,
    parseBody,
    toLogEvents,
};

export type {SearchResultItem};
