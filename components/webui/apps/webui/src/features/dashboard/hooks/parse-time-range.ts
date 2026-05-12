import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

/** Truncate to second granularity to prevent infinite refetch loops */
const truncateToSecond = (ms: number) => Math.floor(ms / 1000) * 1000;

const RELATIVE_TIME_RE = /^now-(\d+)([smhd])$/;

/**
 * Parse a relative time expression (e.g. "now-6h", "now-30d") or absolute ms
 * timestamp into a millisecond epoch using dayjs.
 */
export function parseTimeRange (value: string): number {
    if ("now" === value) {
        return truncateToSecond(Date.now());
    }

    const match = value.match(RELATIVE_TIME_RE);
    if (match) {
        const num = parseInt(match[1] ?? "0", 10);
        const unit = match[2];
        const unitMap: Record<string, duration.DurationUnitType> = {s: "second", m: "minute", h: "hour", d: "day"};
        const djsUnit = unitMap[unit ?? ""] ?? "millisecond";

        return truncateToSecond(dayjs().subtract(num, djsUnit).valueOf());
    }

    const num = Number(value);
    if (!isNaN(num)) {
        return truncateToSecond(num);
    }

    return truncateToSecond(Date.now());
}
