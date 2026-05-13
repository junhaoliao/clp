import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {useShallow} from "zustand/react/shallow";

import {useDashboardTimeStore} from "../stores/time-store";
import {QUICK_RANGES} from "./time-range-picker-constants";
import {
    loadRecentRanges,
    MAX_RECENT,
    saveRecentRanges,
} from "./time-range-picker-utils";

import {toLocal} from "@/lib/utils";


/**
 * Custom hook for TimeRangePicker state management.
 */
// eslint-disable-next-line max-lines-per-function
export const useTimeRangePickerState = () => {
    const {
        activePreset,
        liveTail,
        setActivePreset,
        setLiveTail,
        setTimeRange,
        timeRange,
    } = useDashboardTimeStore(useShallow((s) => ({
        activePreset: s.activePreset,
        liveTail: s.liveTail,
        setActivePreset: s.setActivePreset,
        setLiveTail: s.setLiveTail,
        setTimeRange: s.setTimeRange,
        timeRange: s.timeRange,
    })));

    const [
        draftActivePreset, setDraftActivePreset,
    ] = useState<string | null>(activePreset);
    const [draftLive, setDraftLive] = useState(liveTail);
    const [
        committedPreset, setCommittedPreset,
    ] = useState<string | null>(activePreset);
    const [recentRanges, setRecentRanges] = useState<string[]>(loadRecentRanges);
    const [draftStart, setDraftStart] = useState(timeRange.from);
    const [draftEnd, setDraftEnd] = useState(timeRange.to);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const committedRef = useRef({end: timeRange.to, start: timeRange.from});

    useEffect(() => {
        if (liveTail) {
            setDraftStart(timeRange.from);
            setDraftEnd(timeRange.to);
        }
    }, [timeRange.from,
        timeRange.to,
        liveTail]);

    useEffect(() => {
        committedRef.current = {end: timeRange.to, start: timeRange.from};
    }, [timeRange.from,
        timeRange.to]);

    const isDraftModified = useMemo(
        () => draftStart !== committedRef.current.start ||
            draftEnd !== committedRef.current.end,
        [draftStart,
            draftEnd],
    );

    const isRangeInvalid = useMemo(() => {
        const ds = new Date(draftStart);
        const de = new Date(draftEnd);

        if (isNaN(ds.getTime()) || isNaN(de.getTime())) {
            return false;
        }

        return ds.getTime() > de.getTime();
    }, [draftStart,
        draftEnd]);

    const handleQuickRange = useCallback(
        (key: string, durationMs: number) => {
            const now = new Date();
            setDraftStart(toLocal(new Date(now.getTime() - durationMs)));
            setDraftEnd(toLocal(now));
            setDraftActivePreset(key);
            setDraftLive(true);
        },
        [],
    );

    const handleLiveToggle = useCallback(() => {
        if (liveTail) {
            setLiveTail(false);
            setCommittedPreset(null);
            setActivePreset(null);
        } else {
            setLiveTail(true);
            const preset = draftActivePreset ?? committedPreset ?? "24h";
            const range = QUICK_RANGES.find((r) => r.key === preset);

            if (range) {
                const now = new Date();
                setTimeRange(
                    toLocal(new Date(now.getTime() - range.durationMs)),
                    toLocal(now),
                );
                setCommittedPreset(preset);
                setActivePreset(preset);
            }
        }
    }, [liveTail,
        setLiveTail,
        draftActivePreset,
        committedPreset,
        setTimeRange,
        setActivePreset]);

    const handleApply = useCallback(() => {
        setTimeRange(draftStart, draftEnd);
        committedRef.current = {end: draftEnd, start: draftStart};

        if (draftLive && draftActivePreset) {
            setLiveTail(true);
            setCommittedPreset(draftActivePreset);
            setActivePreset(draftActivePreset);
        } else {
            setLiveTail(false);
            setCommittedPreset(null);
            setActivePreset(null);

            const entry = `${draftStart}|${draftEnd}`;
            setRecentRanges((prev) => {
                const filtered = prev.filter((r) => r !== entry);
                const next = [entry,
                    ...filtered].slice(0, MAX_RECENT);

                saveRecentRanges(next);

                return next;
            });
        }

        setPopoverOpen(false);
    }, [draftStart,
        draftEnd,
        draftLive,
        draftActivePreset,
        setTimeRange,
        setLiveTail,
        setActivePreset]);

    const handleRecentRange = useCallback(
        (entry: string) => {
            const [s = "", e = ""] = entry.split("|");
            setDraftStart(s);
            setDraftEnd(e);
            setDraftActivePreset(null);
            setDraftLive(false);
        },
        [],
    );

    const handleDraftChange = useCallback(
        (field: "start" | "end", v: string) => {
            if ("start" === field) {
                setDraftStart(v);
            } else {
                setDraftEnd(v);
            }

            setDraftActivePreset(null);
        },
        [],
    );

    useEffect(() => {
        if (popoverOpen) {
            setDraftStart(timeRange.from);
            setDraftEnd(timeRange.to);
            setDraftLive(liveTail);
            setDraftActivePreset(committedPreset);
        }
    }, [popoverOpen,
        timeRange.from,
        timeRange.to,
        liveTail,
        committedPreset]);

    return {
        committedPreset,
        draftActivePreset,
        draftEnd,
        draftLive,
        draftStart,
        handleApply,
        handleDraftChange,
        handleLiveToggle,
        handleQuickRange,
        handleRecentRange,
        isDraftModified,
        isRangeInvalid,
        liveTail,
        popoverOpen,
        recentRanges,
        setDraftLive,
        setPopoverOpen,
        timeRange,
    };
};
