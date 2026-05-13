import {
    useMemo,
    useRef,
} from "react";

import {
    ChevronDown,
    Circle,
} from "lucide-react";

import {QUICK_RANGES} from "./time-range-picker-constants";
import {formatRangeSummary} from "./time-range-picker-utils";
import {useTimeRangePickerState} from "./use-time-range-picker-state";

import {Button} from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {Toggle} from "@/components/ui/toggle";


/**
 * Time range picker with live toggle and popover for quick/absolute ranges.
 */
// eslint-disable-next-line max-lines-per-function
export const TimeRangePicker = () => {
    const {
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
    } = useTimeRangePickerState();

    const toInputRef = useRef<HTMLInputElement>(null);

    const triggerLabel = useMemo(() => {
        const preset = QUICK_RANGES.find((r) => r.key === committedPreset);

        return preset ?
            preset.label :
            formatRangeSummary(timeRange.from, timeRange.to);
    }, [committedPreset,
        timeRange.from,
        timeRange.to]);

    return (
        <div className={"flex items-stretch"}>
            <Toggle
                className={"gap-1.5 rounded-r-none border-r-0 h-8 text-xs"}
                pressed={liveTail}
                variant={"outline"}
                onPressedChange={handleLiveToggle}
            >
                <Circle
                    className={`h-3 w-3 ${liveTail ?
                        "fill-green-500 text-green-500" :
                        "fill-gray-400 text-gray-400"}`}/>
                Live
            </Toggle>

            <Popover
                open={popoverOpen}
                onOpenChange={setPopoverOpen}
            >
                <PopoverTrigger
                    render={(props: React.HTMLAttributes<HTMLElement>) => (
                        <Button
                            className={"rounded-l-none gap-1.5 h-8"}
                            size={"sm"}
                            variant={"outline"}
                            {...props}
                        >
                            {triggerLabel}
                            <ChevronDown className={"h-3.5 w-3.5 opacity-60"}/>
                        </Button>
                    )}/>
                <PopoverContent
                    align={"start"}
                    className={"w-auto p-0"}
                    sideOffset={4}
                >
                    <div className={"flex items-stretch"}>
                        {/* Left panel: Quick ranges */}
                        <div
                            className={
                                "w-[180px] border-r border-border " +
                            "px-3 py-2.5 flex flex-col gap-0.5"
                            }
                        >
                            <div
                                className={
                                    "text-xs font-medium text-muted-foreground " +
                                "px-2 py-1.5"
                                }
                            >
                                Quick ranges
                            </div>
                            {QUICK_RANGES.map((range) => (
                                <button
                                    key={range.key}
                                    className={`text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                                        draftActivePreset === range.key ?
                                            "bg-primary/10 text-primary font-medium" :
                                            "hover:bg-muted"
                                    }`}
                                    onClick={() => {
                                        handleQuickRange(
                                            range.key,
                                            range.durationMs,
                                        );
                                    }}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>

                        {/* Right panel: Absolute time range + Recently used + Apply */}
                        <div className={"flex-1 px-3 py-2.5 flex flex-col gap-3"}>
                            <div
                                className={"text-xs font-medium text-muted-foreground"}
                            >
                                Absolute time range
                            </div>

                            <div className={"flex flex-col gap-2"}>
                                <label className={"flex flex-col gap-1"}>
                                    <span
                                        className={"text-xs text-muted-foreground"}
                                    >
                                        From
                                    </span>
                                    <input
                                        type={"datetime-local"}
                                        value={draftStart}
                                        className={`rounded-md border px-3 py-1.5 text-sm ${
                                            isRangeInvalid ?
                                                "border-destructive bg-destructive/5" :
                                                "border-input bg-background"
                                        }`}
                                        onChange={(e) => {
                                            handleDraftChange(
                                                "start",
                                                e.target.value,
                                            );
                                        }}/>
                                </label>
                                <label className={"flex flex-col gap-1"}>
                                    <span
                                        className={"text-xs text-muted-foreground"}
                                    >
                                        To
                                    </span>
                                    <div className={"relative"}>
                                        <input
                                            ref={toInputRef}
                                            type={"datetime-local"}
                                            value={draftEnd}
                                            className={
                                                "rounded-md border border-input " +
                                                "bg-background px-3 py-1.5 text-sm"
                                            }
                                            onChange={(e) => {
                                                handleDraftChange(
                                                    "end",
                                                    e.target.value,
                                                );
                                                if (draftLive) {
                                                    setDraftLive(false);
                                                }
                                            }}/>
                                        {draftLive && (
                                            <span
                                                className={
                                                    "absolute inset-px right-9 " +
                                                    "flex items-center pl-3 " +
                                                    "text-sm bg-background " +
                                                    "cursor-pointer rounded-sm " +
                                                    "select-none"
                                                }
                                                onClick={() => {
                                                    toInputRef.current?.showPicker();
                                                }}
                                            >
                                                now
                                            </span>
                                        )}
                                    </div>
                                </label>
                            </div>

                            {0 < recentRanges.length && (
                                <div className={"flex flex-col gap-1"}>
                                    <div
                                        className={"text-xs font-medium text-muted-foreground"}
                                    >
                                        Recently used
                                    </div>
                                    <div
                                        className={
                                            "max-h-[120px] overflow-y-auto " +
                                        "flex flex-col gap-0.5"
                                        }
                                    >
                                        {recentRanges.map((entry) => {
                                            const [
                                                s = "", e = "",
                                            ] = entry.split("|");

                                            return (
                                                <button
                                                    key={entry}
                                                    className={
                                                        "text-left text-xs " +
                                                        "px-2 py-1.5 " +
                                                        "rounded-md hover:bg-muted " +
                                                        "transition-colors truncate"
                                                    }
                                                    title={formatRangeSummary(
                                                        s,
                                                        e,
                                                    )}
                                                    onClick={() => {
                                                        handleRecentRange(
                                                            entry,
                                                        );
                                                    }}
                                                >
                                                    {formatRangeSummary(s, e)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className={"mt-auto pt-2 flex justify-end"}>
                                <Button
                                    disabled={!isDraftModified || isRangeInvalid}
                                    size={"sm"}
                                    onClick={handleApply}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};
