/** Accepts both the strict DataFrame[] and the looser PanelComponentProps.data shape */
type QueryData = Array<{
    name: string;
    refId?: string;
    fields: Array<{
        name: string;
        type: string;
        values: unknown[];
        config?: {
            displayName?: string;
            unit?: string;
            decimals?: number;
            filterable?: boolean;
        };
    }>;
    length: number;
}>;

/**
 * Find a DataFrame by refId (name field)
 *
 * @param data
 * @param refId
 */
function findFrame (data: QueryData, refId: string) {
    return data.find((f) => f.name === refId || f.refId === refId);
}

/**
 * Find a field by name within a frame
 *
 * @param frame
 * @param fieldName
 */
function findField (frame: QueryData[number], fieldName: string): {values: unknown[]} | undefined {
    const field = frame.fields.find((f) => f.name === fieldName || f.config?.displayName === fieldName);
    if (!field) {
        return undefined;
    }

    return {values: field.values};
}

/**
 * Format a value for display in markdown
 *
 * @param value
 */
function formatValue (value: unknown): string {
    if (null === value || value === undefined) {
        return "";
    }
    if ("number" === typeof value) {
        return Number.isInteger(value) ?
            String(value) :
            value.toFixed(2);
    }

    return String(value);
}

/**
 * Replace `${data.A.fieldName[index]}` patterns with the corresponding value.
 * Pattern: ${data.<refId>.<fieldName>[<index>]}
 * - index can be a number, "last" (last row), or omitted (defaults to 0)
 *
 * @param content
 * @param data
 */
function interpolateValues (content: string, data: QueryData): string {
    return content.replace(
        /\$\{data\.(\w+)\.(\w+)(?:\[(\d+|last)\])?\}/g,
        (_match, refId, fieldName, index) => {
            const frame = findFrame(data, refId);
            if (!frame) {
                return _match;
            }
            const field = findField(frame, fieldName);
            if (!field) {
                return _match;
            }

            let idx = 0;
            if ("last" === index) {
                idx = field.values.length - 1;
            } else if (undefined !== index) {
                idx = Number(index);
            }

            const value = field.values[idx];
            if (undefined === value && idx < field.values.length) {
                return "";
            }
            if (value === undefined) {
                return _match;
            }

            return formatValue(value);
        },
    );
}

/**
 * Replace `{{table A}}` with a markdown table generated from the DataFrame.
 * Uses all fields as columns and all rows.
 *
 * @param content
 * @param data
 */
function interpolateTable (content: string, data: QueryData): string {
    return content.replace(
        /\{\{table\s+(\w+)\}\}/g,
        (_match, refId) => {
            const frame = findFrame(data, refId);
            if (!frame) {
                return _match;
            }

            if (0 === frame.fields.length || 0 === frame.length) {
                return "*No data*";
            }

            const headers = frame.fields.map((f) => f.config?.displayName ?? f.name);
            const headerLine = `| ${headers.join(" | ")} |`;
            const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
            const rows: string[] = [];

            for (let rowIdx = 0; rowIdx < frame.length; rowIdx++) {
                const cells = frame.fields.map((f) => formatValue(f.values[rowIdx]));
                rows.push(`| ${cells.join(" | ")} |`);
            }

            return [headerLine,
                separatorLine,
                ...rows].join("\n");
        },
    );
}

/**
 * Replace `{{list A fieldName}}` with a markdown bullet list from the field values.
 *
 * @param content
 * @param data
 */
function interpolateList (content: string, data: QueryData): string {
    return content.replace(
        /\{\{list\s+(\w+)\s+(\w+)\}\}/g,
        (_match, refId, fieldName) => {
            const frame = findFrame(data, refId);
            if (!frame) {
                return _match;
            }
            const field = findField(frame, fieldName);
            if (!field) {
                return _match;
            }

            if (0 === field.values.length) {
                return "*No data*";
            }

            return field.values.map((v) => `- ${formatValue(v)}`).join("\n");
        },
    );
}

/**
 * Replace `{{stat A fieldName}}` with a big-number stat display.
 * Renders the first (or last) value as a bold markdown element.
 *
 * @param content
 * @param data
 */
function interpolateStat (content: string, data: QueryData): string {
    return content.replace(
        /\{\{stat\s+(\w+)\s+(\w+)\}\}/g,
        (_match, refId, fieldName) => {
            const frame = findFrame(data, refId);
            if (!frame) {
                return _match;
            }
            const field = findField(frame, fieldName);
            if (!field || 0 === field.values.length) {
                return _match;
            }

            const value = field.values[field.values.length - 1];
            const unit = frame.fields.find((f) => f.name === fieldName)?.config?.unit ?? "";
            const displayValue = formatValue(value);

            return `# ${displayValue}${unit ?
                ` ${unit}` :
                ""}`;
        },
    );
}

/**
 * Interpolate query data template patterns into markdown content.
 *
 * Supported patterns:
 * - `${data.A.fieldName[0]}` — value interpolation (access field value by index)
 * - `${data.A.fieldName[last]}` — last row value
 * - `${data.A.fieldName}` — shorthand for index 0
 * - `{{table A}}` — render query result as markdown table
 * - `{{list A fieldName}}` — render field values as bullet list
 * - `{{stat A fieldName}}` — render first value as big heading
 *
 * @param content
 * @param data
 */
export function interpolateQueryData (content: string, data: QueryData): string {
    let result = content;
    result = interpolateValues(result, data);
    result = interpolateTable(result, data);
    result = interpolateList(result, data);
    result = interpolateStat(result, data);

    return result;
}
