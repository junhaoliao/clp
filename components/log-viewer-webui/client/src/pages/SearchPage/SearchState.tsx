import dayjs from "dayjs";
import {create} from "zustand";

import {
    DEFAULT_TIME_RANGE,
    TIME_RANGE_OPTION,
    TIME_RANGE_OPTION_DAYJS_MAP,
} from "./SearchControls/TimeRangeInput/utils";


/**
 * Default values of the search state.
 */
const SEARCH_STATE_DEFAULT = Object.freeze({
    queryString: "",
    timeRangeOption: DEFAULT_TIME_RANGE,
    timeRange: TIME_RANGE_OPTION_DAYJS_MAP[DEFAULT_TIME_RANGE],
});

interface SearchState {
    queryString: string;
    timeRangeOption: TIME_RANGE_OPTION;
    setTimeRangeOption: (option: TIME_RANGE_OPTION) => void;
    timeRange: [dayjs.Dayjs, dayjs.Dayjs];
    updateQueryString: (query: string) => void;
    updateTimeRange: (range: [dayjs.Dayjs, dayjs.Dayjs]) => void;
}

const useSearchStore = create<SearchState>((set) => ({
    ...SEARCH_STATE_DEFAULT,
    setTimeRangeOption: (option: TIME_RANGE_OPTION) => {
        set({timeRangeOption: option});
    },
    updateQueryString: (query) => {
        set({queryString: query});
    },
    updateTimeRange: (range) => {
        set({timeRange: range});
    },
}));


export {SEARCH_STATE_DEFAULT};
export default useSearchStore;
