import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {useDashboardTimeStore} from "../stores/time-store";
import {useState, useCallback, useEffect} from "react";
import {parseTimeRange} from "../hooks/parse-time-range";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_RANGE_OPTIONS = [
  {label: "Last 5 minutes", value: "now-5m"},
  {label: "Last 15 minutes", value: "now-15m"},
  {label: "Last 1 hour", value: "now-1h"},
  {label: "Last 6 hours", value: "now-6h"},
  {label: "Last 24 hours", value: "now-24h"},
  {label: "Last 7 days", value: "now-7d"},
  {label: "Last 30 days", value: "now-30d"},
  {label: "Absolute range", value: "absolute"},
] as const;

const REFRESH_OPTIONS = [
  {label: "Off", value: ""},
  {label: "5s", value: "5s"},
  {label: "10s", value: "10s"},
  {label: "30s", value: "30s"},
  {label: "1m", value: "1m"},
  {label: "5m", value: "5m"},
] as const;

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export function TimeRangePicker() {
  const timeRange = useDashboardTimeStore((s) => s.timeRange);
  const refreshInterval = useDashboardTimeStore((s) => s.refreshInterval);
  const tz = useDashboardTimeStore((s) => s.timezone);
  const setTimeRange = useDashboardTimeStore((s) => s.setTimeRange);
  const setRefreshInterval = useDashboardTimeStore((s) => s.setRefreshInterval);
  const setTimezone = useDashboardTimeStore((s) => s.setTimezone);
  const [showAbsolute, setShowAbsolute] = useState(false);
  const [absoluteFrom, setAbsoluteFrom] = useState("");
  const [absoluteTo, setAbsoluteTo] = useState("");

  // Sync URL params on mount and on time range change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFrom = params.get("from");
    const urlTo = params.get("to");
    if (urlFrom && urlTo) {
      setTimeRange(urlFrom, urlTo);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (timeRange.from.startsWith("now")) {
      url.searchParams.set("from", timeRange.from);
    } else {
      url.searchParams.delete("from");
    }
    if (timeRange.to.startsWith("now")) {
      url.searchParams.set("to", timeRange.to);
    } else {
      url.searchParams.delete("to");
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [timeRange]);

  const handleRelativeChange = useCallback((value: string) => {
    if (value === "absolute") {
      setShowAbsolute(true);
      const from = parseTimeRange(timeRange.from);
      const to = parseTimeRange(timeRange.to);
      setAbsoluteFrom(dayjs(from).tz(tz).format("YYYY-MM-DDTHH:mm"));
      setAbsoluteTo(dayjs(to).tz(tz).format("YYYY-MM-DDTHH:mm"));
    } else {
      setShowAbsolute(false);
      setTimeRange(value, "now");
    }
  }, [timeRange, tz, setTimeRange]);

  const applyAbsoluteRange = useCallback(() => {
    if (absoluteFrom && absoluteTo) {
      const fromMs = dayjs.tz(absoluteFrom, tz).valueOf();
      const toMs = dayjs.tz(absoluteTo, tz).valueOf();
      setTimeRange(String(fromMs), String(toMs));
      setShowAbsolute(false);
    }
  }, [absoluteFrom, absoluteTo, tz, setTimeRange]);

  const selectedValue = showAbsolute ? "absolute" : timeRange.from;

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        value={selectedValue}
        onChange={(e) => handleRelativeChange(e.target.value)}
      >
        {TIME_RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {showAbsolute && (
        <div className="flex items-center gap-1">
          <input
            type="datetime-local"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={absoluteFrom}
            onChange={(e) => setAbsoluteFrom(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="datetime-local"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={absoluteTo}
            onChange={(e) => setAbsoluteTo(e.target.value)}
          />
          <button
            type="button"
            className="h-8 px-2 text-sm rounded-md bg-primary text-primary-foreground"
            onClick={applyAbsoluteRange}
          >
            Apply
          </button>
          <button
            type="button"
            className="h-8 px-2 text-sm rounded-md border"
            onClick={() => setShowAbsolute(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {!showAbsolute && (
        <span className="text-xs text-muted-foreground">to now</span>
      )}

      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-sm max-w-40"
        value={tz}
        onChange={(e) => setTimezone(e.target.value)}
        title={`Timezone: ${tz}`}
      >
        {COMMON_TIMEZONES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        value={refreshInterval ?? ""}
        onChange={(e) => setRefreshInterval(e.target.value || null)}
      >
        {REFRESH_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
