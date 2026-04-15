/**
 * Removes wrapping quotes from the given string, if it's quoted, and unescapes
 * quotes from within the quoted string.
 *
 * @param str
 * @param quoteChar
 * @param escapeChar
 * @return The processed string
 * @throws {Error} If unescaped quotes are found within the string
 * @throws {Error} If begin/end quote is missing
 */
const unquoteString = (
    str: string,
    quoteChar = "\"",
    escapeChar = "\\",
): string => {
    if (0 === str.length) {
        return str;
    }

    const positionsToRemove = collectPositionsToRemove(str, quoteChar, escapeChar);
    if (0 === positionsToRemove.length) {
        return str;
    }

    validateQuotePositions(positionsToRemove, str, quoteChar);

    const chars = Array.from(str);

    return chars.filter((_, i) => !positionsToRemove.includes(i)).join("");
};

/**
 * Scans the string to find positions of escape characters and unescaped quotes.
 *
 * @param str
 * @param quoteChar
 * @param escapeChar
 * @return Array of character positions to remove
 */
const collectPositionsToRemove = (
    str: string,
    quoteChar: string,
    escapeChar: string,
): number[] => {
    const positions: number[] = [];
    let isEscaped = false;

    for (let i = 0; i < str.length; ++i) {
        const c = str[i];
        if (isEscaped) {
            isEscaped = false;
            if (c === quoteChar) {
                positions.push(i - 1);
            }
        } else if (c === escapeChar) {
            isEscaped = true;
        } else if (c === quoteChar) {
            positions.push(i);
        }
    }

    return positions;
};

/**
 * Validates that unescaped quotes only appear at the beginning and end.
 *
 * @param positions
 * @param str
 * @param quoteChar
 * @throws {Error} If unescaped quotes are found within the string
 * @throws {Error} If begin/end quote is missing
 */
const validateQuotePositions = (
    positions: number[],
    str: string,
    quoteChar: string,
): void => {
    const lastIdx = str.length - 1;
    let foundBegin = false;
    let foundEnd = false;

    for (const pos of positions) {
        const char = str[pos];
        if (quoteChar === char) {
            if (0 === pos) {
                foundBegin = true;
            } else if (lastIdx === pos) {
                foundEnd = true;
            } else {
                throw new Error(`Found unescaped quote character (${quoteChar}) within.`);
            }
        }
    }

    if (foundBegin !== foundEnd) {
        throw new Error("Begin/end quote is missing.");
    }
};


export {unquoteString};
