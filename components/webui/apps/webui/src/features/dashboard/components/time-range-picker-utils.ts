const RECENT_KEY = "time-range-picker-recent";
const MAX_RECENT = 5;


/**
 * Format a time range for display.
 *
 * @param start
 * @param end
 */
const formatRangeSummary = (start: string, end: string): string => {
    const sd = new Date(start);
    const ed = new Date(end);

    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
        return "Custom range";
    }

    const fmt = (d: Date) => {
        const dateStr = d.toLocaleDateString(
            navigator.language,
            {month: "short", day: "numeric"},
        );
        const timeStr = d.toLocaleTimeString(
            navigator.language,
            {hour: "2-digit", minute: "2-digit"},
        );

        return `${dateStr} ${timeStr}`;
    };

    return `${fmt(sd)} → ${fmt(ed)}`;
};


/**
 * Load recently used time ranges from localStorage.
 */
const loadRecentRanges = (): string[] => {
    try {
        return JSON.parse(
            localStorage.getItem(RECENT_KEY) || "[]",
        ) as string[];
    } catch {
        return [];
    }
};


/**
 * Save recently used time ranges to localStorage.
 *
 * @param ranges
 */
const saveRecentRanges = (ranges: string[]) => {
    localStorage.setItem(
        RECENT_KEY,
        JSON.stringify(ranges.slice(0, MAX_RECENT)),
    );
};


export {
    formatRangeSummary,
    loadRecentRanges,
    MAX_RECENT,
    saveRecentRanges,
};
