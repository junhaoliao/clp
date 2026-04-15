import {useState} from "react";

import dayjs from "dayjs";

import {Button} from "../../../components/ui/button";
import {Input} from "../../../components/ui/input";
import {TIME_RANGE_OPTION} from "../../../stores/search-store";


/**
 * Timestamp display format matching the original webui.
 */
const DATETIME_FORMAT_TEMPLATE = "YYYY-MMM-DD HH:mm:ss";

const MINUTES_15 = 15;
const HOURS_24 = 24;
const DAYS_7 = 7;

/**
 * Time range display text for preset options, matching the original webui.
 */
const TIME_RANGE_DISPLAY_TEXT: Record<TIME_RANGE_OPTION, {end: string; start: string}> = {
    [TIME_RANGE_OPTION.LAST_15_MINUTES]: {end: "Now", start: "15 minutes ago"},
    [TIME_RANGE_OPTION.LAST_1_HOUR]: {end: "Now", start: "1 hour ago"},
    [TIME_RANGE_OPTION.LAST_24_HOURS]: {end: "Now", start: "24 hours ago"},
    [TIME_RANGE_OPTION.LAST_7_DAYS]: {end: "Now", start: "7 days ago"},
    [TIME_RANGE_OPTION.ALL_TIME]: {end: "Last timestamp", start: "First timestamp"},
    [TIME_RANGE_OPTION.CUSTOM]: {end: "End date", start: "Start date"},
};

/**
 * Time range presets that map to Dayjs ranges.
 */
const TIME_RANGE_PRESETS: Record<string, () => [dayjs.Dayjs, dayjs.Dayjs]> = {
    [TIME_RANGE_OPTION.LAST_15_MINUTES]: () => [dayjs().subtract(MINUTES_15, "minute"),
        dayjs()],
    [TIME_RANGE_OPTION.LAST_1_HOUR]: () => [dayjs().subtract(1, "hour"),
        dayjs()],
    [TIME_RANGE_OPTION.LAST_24_HOURS]: () => [dayjs().subtract(HOURS_24, "hour"),
        dayjs()],
    [TIME_RANGE_OPTION.LAST_7_DAYS]: () => [dayjs().subtract(DAYS_7, "day"),
        dayjs()],
};

/**
 * Human-readable label for time range options.
 */
const TIME_RANGE_LABELS: Record<TIME_RANGE_OPTION, string> = {
    [TIME_RANGE_OPTION.ALL_TIME]: "All Time",
    [TIME_RANGE_OPTION.CUSTOM]: "Custom",
    [TIME_RANGE_OPTION.LAST_15_MINUTES]: "Last 15 Minutes",
    [TIME_RANGE_OPTION.LAST_1_HOUR]: "Last Hour",
    [TIME_RANGE_OPTION.LAST_24_HOURS]: "Last 24 Hours",
    [TIME_RANGE_OPTION.LAST_7_DAYS]: "Last 7 Days",
};


/**
 * Applies a time range option selection, updating the range values.
 *
 * @param option
 * @param onTimeRangeOptionChange
 * @param onTimeRangeChange
 * @param setOpen
 */
const handleSelect = (
    option: TIME_RANGE_OPTION,
    onTimeRangeOptionChange: (o: TIME_RANGE_OPTION) => void,
    onTimeRangeChange: (r: [dayjs.Dayjs, dayjs.Dayjs]) => void,
    setOpen: (v: boolean) => void,
) => {
    onTimeRangeOptionChange(option);

    if (TIME_RANGE_OPTION.CUSTOM === option) {
        setOpen(true);

        return;
    }

    setOpen(false);

    if (TIME_RANGE_OPTION.ALL_TIME === option) {
        onTimeRangeChange([dayjs(0),
            dayjs()]);
    } else {
        const rangeFn = TIME_RANGE_PRESETS[option];
        if (rangeFn) {
            onTimeRangeChange(rangeFn());
        }
    }
};


/**
 * Handles custom datetime input changes.
 *
 * @param params
 * @param params.index
 * @param params.value
 * @param params.timeRange
 * @param params.onTimeRangeChange
 * @param params.onTimeRangeOptionChange
 */
const handleInputChange = ({
    index,
    onTimeRangeChange,
    onTimeRangeOptionChange,
    timeRange,
    value,
}: {
    index: 0 | 1;
    onTimeRangeChange: (r: [dayjs.Dayjs, dayjs.Dayjs]) => void;
    onTimeRangeOptionChange: (o: TIME_RANGE_OPTION) => void;
    timeRange: [dayjs.Dayjs, dayjs.Dayjs];
    value: string;
}) => {
    const newRange: [dayjs.Dayjs, dayjs.Dayjs] = [...timeRange];
    newRange[index] = dayjs(value);
    onTimeRangeChange(newRange);
    onTimeRangeOptionChange(TIME_RANGE_OPTION.CUSTOM);
};


/**
 * Time range picker with preset dropdown and custom datetime inputs.
 *
 * @param root0
 * @param root0.disabled
 * @param root0.timeRange
 * @param root0.timeRangeOption
 * @param root0.onTimeRangeChange
 * @param root0.onTimeRangeOptionChange
 */
const TimeRangePicker = ({
    disabled,
    timeRange,
    timeRangeOption,
    onTimeRangeChange,
    onTimeRangeOptionChange,
}: {
    disabled: boolean;
    timeRange: [dayjs.Dayjs, dayjs.Dayjs];
    timeRangeOption: TIME_RANGE_OPTION;
    onTimeRangeChange: (range: [dayjs.Dayjs, dayjs.Dayjs]) => void;
    onTimeRangeOptionChange: (option: TIME_RANGE_OPTION) => void;
}) => {
    const [open, setOpen] = useState(false);
    const isCustom = TIME_RANGE_OPTION.CUSTOM === timeRangeOption;

    const startText = isCustom || open ?
        timeRange[0].utc().format(DATETIME_FORMAT_TEMPLATE) :
        TIME_RANGE_DISPLAY_TEXT[timeRangeOption].start;

    const endText = isCustom || open ?
        timeRange[1].utc().format(DATETIME_FORMAT_TEMPLATE) :
        TIME_RANGE_DISPLAY_TEXT[timeRangeOption].end;

    return (
        <div className={"relative flex min-w-[350px]"}>
            <Input
                className={"w-1/2 rounded-l-md rounded-r-none border-r-0"}
                disabled={disabled}
                placeholder={"First timestamp"}
                value={startText}
                type={isCustom ?
                    "datetime-local" :
                    "text"}
                onChange={(e) => {
                    handleInputChange({
                        index: 0,
                        onTimeRangeChange: onTimeRangeChange,
                        onTimeRangeOptionChange: onTimeRangeOptionChange,
                        timeRange: timeRange,
                        value: e.target.value,
                    });
                }}
                onFocus={() => {
                    if (!isCustom) {
                        setOpen(true);
                    }
                }}/>
            <Input
                className={"w-1/2 rounded-l-none"}
                disabled={disabled}
                placeholder={"Last timestamp"}
                value={endText}
                type={isCustom ?
                    "datetime-local" :
                    "text"}
                onChange={(e) => {
                    handleInputChange({
                        index: 1,
                        onTimeRangeChange: onTimeRangeChange,
                        onTimeRangeOptionChange: onTimeRangeOptionChange,
                        timeRange: timeRange,
                        value: e.target.value,
                    });
                }}
                onFocus={() => {
                    if (!isCustom) {
                        setOpen(true);
                    }
                }}/>

            {/* Preset dropdown */}
            {open && !isCustom && (
                <div
                    className={
                        "absolute top-full left-0 z-30 mt-1 w-full " +
                    "rounded-md border bg-background shadow-lg"
                    }
                >
                    <div className={"p-1"}>
                        {Object.values(TIME_RANGE_OPTION)
                            .filter((opt) => TIME_RANGE_OPTION.CUSTOM !== opt)
                            .map((option) => (
                                <Button
                                    key={option}
                                    type={"button"}
                                    className={
                                        "w-full justify-start rounded px-3 py-1.5 " +
                                        "text-sm font-normal h-auto"
                                    }
                                    variant={timeRangeOption === option ?
                                        "secondary" :
                                        "ghost"}
                                    onClick={() => {
                                        handleSelect(
                                            option,
                                            onTimeRangeOptionChange,
                                            onTimeRangeChange,
                                            setOpen,
                                        );
                                    }}
                                >
                                    {TIME_RANGE_LABELS[option]}
                                </Button>
                            ))}
                    </div>
                    <div className={"border-t p-1"}>
                        <Button
                            type={"button"}
                            variant={"ghost"}
                            className={
                                "w-full justify-start rounded px-3 py-1.5 " +
                                "text-sm font-normal h-auto"
                            }
                            onClick={() => {
                                handleSelect(
                                    TIME_RANGE_OPTION.CUSTOM,
                                    onTimeRangeOptionChange,
                                    onTimeRangeChange,
                                    setOpen,
                                );
                            }}
                        >
                            Custom
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};


export {TimeRangePicker};
