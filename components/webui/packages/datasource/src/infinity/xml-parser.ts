import type {
    DataField,
    DataFrame,
} from "../types.js";


/**
 * Extract text content between XML tags.
 *
 * @param xml
 * @param tagName
 */
function extractXmlRecords (xml: string, tagName: string): Record<string, string>[] {
    const records: Record<string, string>[] = [];
    const openTag = `<${tagName}`;
    const closeTag = `</${tagName}>`;

    let searchStart = 0;

    while (searchStart < xml.length) {
        const openIdx = xml.indexOf(openTag, searchStart);
        if (-1 === openIdx) {
            break;
        }

        // Skip past the opening tag (may have attributes)
        const tagEnd = xml.indexOf(">", openIdx + openTag.length);
        if (-1 === tagEnd) {
            break;
        }

        const closeIdx = xml.indexOf(closeTag, tagEnd);
        if (-1 === closeIdx) {
            break;
        }

        const inner = xml.slice(tagEnd + 1, closeIdx);
        const record = extractXmlFields(inner);
        if (0 < Object.keys(record).length) {
            records.push(record);
        }

        searchStart = closeIdx + closeTag.length;
    }

    return records;
}

/**
 *
 * @param innerXml
 */
function extractXmlFields (innerXml: string): Record<string, string> {
    const record: Record<string, string> = {};
    const tagRegex = /<(\w+)[^>]*>([\s\S]*?)<\/\1>/g;
    let match = tagRegex.exec(innerXml);
    while (null !== match) {
        const fieldName = match[1]!;
        const textContent = match[2]!.trim();
        if ("" !== textContent) {
            record[fieldName] = textContent;
        }
        match = tagRegex.exec(innerXml);
    }

    return record;
}

/**
 * Auto-detect the most common repeating child element.
 *
 * @param xml
 */
function detectRepeatingElement (xml: string): string | undefined {
    const tagCounts: Record<string, number> = {};
    const tagRegex = /<(\w+)[^>]*>/g;
    let match = tagRegex.exec(xml);
    while (null !== match) {
        const tag = match[1]!;
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        match = tagRegex.exec(xml);
    }

    let bestTag: string | undefined;
    let bestCount = 0;
    for (const [tag, count] of Object.entries(tagCounts)) {
        if (count > bestCount && 1 < count) {
            bestCount = count;
            bestTag = tag;
        }
    }

    return bestTag;
}

/**
 * Parse XML response into DataFrame format.
 *
 * @param xml
 * @param itemTag
 * @param columns
 */
export function parseXmlResponse (
    xml: string,
    itemTag?: string,
    columns?: {selector: string; text: string; type: "string" | "number" | "time"}[],
): DataFrame[] {
    const tagName = itemTag ?? detectRepeatingElement(xml);
    if (!tagName) {
        return [{name: "", fields: [], length: 0}];
    }

    const records = extractXmlRecords(xml, tagName);
    if (0 === records.length) {
        return [{name: "", fields: [], length: 0}];
    }

    if (columns && 0 < columns.length) {
        const fields: DataField[] = columns.map((col) => ({
            name: col.text,
            type: col.type,
            values: records.map((record) => {
                const raw = record[col.selector] ?? "";
                if ("number" === col.type) {
                    const num = Number(raw);
                    return isNaN(num) ?
                        null :
                        num;
                }

                return raw;
            }),
        }));

        return [{name: "", fields, length: records.length}];
    }

    const [first] = records;
    const keys = Object.keys(first!);
    const fields: DataField[] = keys.map((key) => ({
        name: key,
        type: "string" as const,
        values: records.map((r) => r[key] ?? ""),
    }));

    return [{name: "", fields, length: records.length}];
}

/**
 * Parse HTML table into DataFrame format.
 *
 * @param html
 * @param columns
 */
export function parseHtmlResponse (
    html: string,
    columns?: {selector: string; text: string; type: "string" | "number" | "time"}[],
): DataFrame[] {
    // If columns use CSS selectors (not numeric), use CSS-based extraction
    if (columns && 0 < columns.length && columns.some((col) => isCssSelector(col.selector))) {
        return parseHtmlByCssSelectors(html, columns);
    }

    // Extract table content
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
        return [{name: "", fields: [], length: 0}];
    }

    const tableContent = tableMatch[1]!;

    // Extract header row (if present)
    const headerMatch = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (!headerMatch) {
        return [{name: "", fields: [], length: 0}];
    }

    const headerRow = headerMatch[1]!;
    const headers = extractTableCells(headerRow, "th");

    // If no <th> found, try <td> for the first row as header
    const useHeaderAsFields = 0 < headers.length;

    // Extract data rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const dataRows: string[][] = [];
    let rowMatch = rowRegex.exec(tableContent);
    let skipFirst = useHeaderAsFields;
    while (null !== rowMatch) {
        if (skipFirst) {
            skipFirst = false;
            rowMatch = rowRegex.exec(tableContent);
            continue;
        }
        const cells = extractTableCells(rowMatch[1]!, "td");
        if (0 < cells.length) {
            dataRows.push(cells);
        }
        rowMatch = rowRegex.exec(tableContent);
    }

    if (0 === dataRows.length) {
        return [{name: "", fields: [], length: 0}];
    }

    if (columns && 0 < columns.length) {
        const fields: DataField[] = columns.map((col, idx) => ({
            name: col.text,
            type: col.type,
            values: dataRows.map((row) => {
                const raw = row[parseInt(col.selector, 10) ?? idx] ?? "";
                if ("number" === col.type) {
                    const num = Number(raw);
                    return isNaN(num) ?
                        null :
                        num;
                }

                return raw;
            }),
        }));

        return [{name: "", fields, length: dataRows.length}];
    }

    // Auto-detect from headers or first row
    const fieldNames = useHeaderAsFields ?
        headers :
        dataRows[0]!.map((_, idx) => `col${idx}`);

    const fields: DataField[] = fieldNames.map((name, idx) => ({
        name: name,
        type: "string" as const,
        values: dataRows.map((row) => row[idx] ?? ""),
    }));

    return [{name: "", fields, length: dataRows.length}];
}

/**
 * Check if a selector is a CSS selector (not a numeric index).
 *
 * @param selector
 */
function isCssSelector (selector: string): boolean {
    return !(/^\d+$/).test(selector.trim());
}

/**
 * Parse HTML using CSS selectors in column definitions.
 *
 * @param html
 * @param columns
 */
function parseHtmlByCssSelectors (
    html: string,
    columns: {selector: string; text: string; type: "string" | "number" | "time"}[],
): DataFrame[] {
    const fields: DataField[] = columns.map((col) => {
        const values = extractHtmlBySelector(html, col.selector);

        return {
            name: col.text,
            type: col.type,
            values: values.map((raw) => {
                if ("number" === col.type) {
                    const num = Number(raw);
                    return isNaN(num) ?
                        null :
                        num;
                }

                return raw;
            }),
        };
    });

    const length = 0 < fields.length ?
        Math.max(...fields.map((f) => f.values.length)) :
        0;

    return [{name: "", fields, length}];
}

/**
 * Extract text content from HTML elements matching a CSS-like selector.
 * Supports: tag selectors (e.g., "li"), class selectors (e.g., ".name"),
 * and tag.class selectors (e.g., "span.name").
 *
 * @param html
 * @param selector
 */
export function extractHtmlBySelector (html: string, selector: string): string[] {
    const results: string[] = [];

    let tagPattern: string;
    let classFilter: string | undefined;

    if (selector.startsWith(".")) {
        // Class selector: .name
        classFilter = selector.slice(1);
        tagPattern = "\\w+";
    } else if (selector.includes(".")) {
        // tag.class selector: span.name
        const dotIdx = selector.indexOf(".");
        tagPattern = selector.slice(0, dotIdx);
        classFilter = selector.slice(dotIdx + 1);
    } else {
        // Tag selector: li
        tagPattern = selector;
    }

    if (undefined !== classFilter) {
        // Match elements with the specific class
        const classRegex = new RegExp(
            `<(${tagPattern})[^>]*class=["'][^"']*\\b${escapeRegex(classFilter)}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`,
            "gi",
        );
        let match = classRegex.exec(html);
        while (null !== match) {
            results.push(stripHtmlTags(match[2]!));
            match = classRegex.exec(html);
        }
    } else {
        // Match elements by tag name
        const tagRegex = new RegExp(
            `<(${tagPattern})[^>]*>([\\s\\S]*?)<\\/\\1>`,
            "gi",
        );
        let match = tagRegex.exec(html);
        while (null !== match) {
            results.push(stripHtmlTags(match[2]!));
            match = tagRegex.exec(html);
        }
    }

    return results;
}

/**
 *
 * @param str
 */
function escapeRegex (str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 *
 * @param html
 */
function stripHtmlTags (html: string): string {
    return html.replace(/<[^>]*>/g, "").trim();
}

/**
 *
 * @param rowHtml
 * @param cellTag
 */
function extractTableCells (rowHtml: string, cellTag: string): string[] {
    const cells: string[] = [];
    const regex = new RegExp(`<${cellTag}[^>]*>([\\s\\S]*?)<\\/${cellTag}>`, "gi");
    let match = regex.exec(rowHtml);
    while (null !== match) {
        const textContent = match[1]!.replace(/<[^>]*>/g, "").trim();
        cells.push(textContent);
        match = regex.exec(rowHtml);
    }

    return cells;
}
