import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";


dayjs.extend(duration);

const MS_PER_SECOND = 1000;


/**
 * Truncate to second granularity to prevent infinite refetch loops.
 *
 * @param ms
 */
const truncateToSecond = (ms: number) => Math.floor(ms / MS_PER_SECOND) * MS_PER_SECOND;

const RELATIVE_TIME_RE = /^now-(\d+)([smhd])$/;

/**
 * Parse a time range value into a millisecond epoch:
 * - "now" → current time
 * - "now-6h", "now-30d" → relative expression
 * - "2023-03-01T00:00:00" → datetime-local string
 * - Numeric string → raw epoch ms
 *
 * @param value
 */
export const parseTimeRange = (value: string): number => {
    if ("now" === value) {
        return truncateToSecond(Date.now());
    }

    const match = value.match(RELATIVE_TIME_RE);

    if (match) {
        const [, numStr,
            unitChar] = match;
        const num = parseInt(numStr ?? "0", 10);

        let djsUnit: duration.DurationUnitType = "millisecond";

        if ("s" === unitChar) {
            djsUnit = "second";
        } else if ("m" === unitChar) {
            djsUnit = "minute";
        } else if ("h" === unitChar) {
            djsUnit = "hour";
        } else if ("d" === unitChar) {
            djsUnit = "day";
        }

        return truncateToSecond(dayjs().subtract(num, djsUnit)
            .valueOf());
    }

    // Pure numeric string → raw epoch ms (must check before dayjs, which
    // would interpret "1715000000000" as year 1715000...)
    const num = Number(value);

    if (!isNaN(num) && !value.includes("T")) {
        return truncateToSecond(num);
    }

    // ISO / datetime-local string (e.g. "2023-03-01T00:00:00")
    const parsed = dayjs(value);

    if (parsed.isValid()) {
        return truncateToSecond(parsed.valueOf());
    }

    return truncateToSecond(Date.now());
};
