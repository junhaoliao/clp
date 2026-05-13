const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_YEAR = 365;

const HOURS_5 = 5;
const HOURS_12 = 12;
const HOURS_24 = 24;
const DAYS_7 = 7;
const DAYS_14 = 14;
const DAYS_30 = 30;
const DAYS_90 = 90;

const ONE_HOUR_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const ONE_DAY_MS = HOURS_PER_DAY * ONE_HOUR_MS;

const QUICK_RANGES = [
    {key: "1h", label: "Last 1 hour", durationMs: ONE_HOUR_MS},
    {key: "5h", label: "Last 5 hours", durationMs: HOURS_5 * ONE_HOUR_MS},
    {key: "12h", label: "Last 12 hours", durationMs: HOURS_12 * ONE_HOUR_MS},
    {key: "24h", label: "Last 24 hours", durationMs: HOURS_24 * ONE_HOUR_MS},
    {key: "7d", label: "Last 7 days", durationMs: DAYS_7 * ONE_DAY_MS},
    {key: "14d", label: "Last 14 days", durationMs: DAYS_14 * ONE_DAY_MS},
    {key: "30d", label: "Last 30 days", durationMs: DAYS_30 * ONE_DAY_MS},
    {key: "90d", label: "Last 90 days", durationMs: DAYS_90 * ONE_DAY_MS},
    {key: "1y", label: "Last year", durationMs: DAYS_PER_YEAR * ONE_DAY_MS},
] as const;


export {
    ONE_DAY_MS,
    ONE_HOUR_MS,
    QUICK_RANGES,
};
