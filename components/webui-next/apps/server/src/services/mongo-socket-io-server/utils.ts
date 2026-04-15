import type {
    Document,
    Filter,
} from "mongodb";

import type {QueryParameters} from "./typings.js";


/**
 *
 * @param query
 */
function convertQueryToChangeStreamFormat (query: Filter<Document>): Filter<Document> {
    const result: Filter<Document> = {};
    for (const [key, value] of Object.entries(query)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result[`fullDocument.${key}`] = value;
    }

    return result;
}

/**
 *
 * @param queryParams
 */
function getQueryHash (queryParams: QueryParameters): string {
    return JSON.stringify(queryParams);
}

/**
 *
 * @param queryHash
 */
function getQuery (queryHash: string): QueryParameters {
    return JSON.parse(queryHash) as QueryParameters;
}

/**
 *
 * @param array
 * @param item
 */
function removeItemFromArray<T> (array: T[], item: T): void {
    const index = array.indexOf(item);
    if (-1 !== index) {
        array.splice(index, 1);
    }
}

export {
    convertQueryToChangeStreamFormat,
    getQuery,
    getQueryHash,
    removeItemFromArray,
};
