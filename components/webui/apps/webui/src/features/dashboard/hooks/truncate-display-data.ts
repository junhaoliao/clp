import type {DataFrame} from "@webui/datasource/types";
import {QUERY_LIMITS} from "@webui/datasource/types";


/**
 * Truncates DataFrame rows to MAX_DISPLAY_ROWS for non-table panels.
 * Table panels use server-side pagination / virtual scrolling and are exempt.
 *
 * @param frames
 */
export function truncateDataForDisplay (frames: DataFrame[]): DataFrame[] {
    return frames.map((frame) => {
        if (frame.length <= QUERY_LIMITS.MAX_DISPLAY_ROWS) {
            return frame;
        }

        return {
            ...frame,
            fields: frame.fields.map((field) => ({
                ...field,
                values: field.values.slice(0, QUERY_LIMITS.MAX_DISPLAY_ROWS),
            })),
            length: QUERY_LIMITS.MAX_DISPLAY_ROWS,
            rowsTruncated: true,
        };
    });
}
