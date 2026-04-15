import type {
    Db,
    Document,
    OptionalId,
} from "mongodb";


/**
 *
 * @param row
 * @param columns
 */
function prestoRowToObject (
    row: unknown[],
    columns: string[],
): {row: Record<string, unknown>} {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = row[i];
    }

    return {row: obj};
}

/**
 *
 * @param data
 * @param columns
 * @param searchJobId
 * @param mongoDb
 */
async function insertPrestoRowsToMongo (
    data: unknown[][],
    columns: string[],
    searchJobId: string,
    mongoDb: Db,
): Promise<void> {
    if (0 === data.length) {
        return;
    }
    const docs: OptionalId<Document>[] = data.map((row, idx) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        _id: idx as any,
        ...prestoRowToObject(row, columns),
    }));

    await mongoDb.collection(searchJobId).insertMany(docs);
}

export {
    insertPrestoRowsToMongo,
    prestoRowToObject,
};
