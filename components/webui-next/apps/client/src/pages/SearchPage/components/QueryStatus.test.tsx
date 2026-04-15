import {
    act,
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import useSearchStore, {
    SEARCH_STATE_DEFAULT,
    SEARCH_UI_STATE,
} from "../../../stores/search-store";
import {QueryStatus} from "./QueryStatus";


// Mock usePseudoProgress
const mockStart = vi.fn();
const mockStop = vi.fn();
let mockProgress: number | null = null;

vi.mock("../../../hooks/use-pseudo-progress", () => ({
    usePseudoProgress: () => ({
        progress: mockProgress,
        start: mockStart,
        stop: mockStop,
    }),
}));

// Mock useQuerySpeed
let mockSpeedText = "";

vi.mock("../hooks/use-query-speed", () => ({
    useQuerySpeed: () => ({speedText: mockSpeedText}),
}));


describe("QueryStatus", () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockProgress = null;
        mockSpeedText = "";
        act(() => {
            useSearchStore.setState({...SEARCH_STATE_DEFAULT});
        });
    });

    it("shows nothing in DEFAULT state with no results", () => {
        const {container} = render(<QueryStatus/>);
        expect(container.innerHTML).toBe("");
    });

    it("shows results count in DEFAULT state with results", () => {
        act(() => {
            useSearchStore.setState({numSearchResultsTable: 42});
        });
        render(<QueryStatus/>);
        expect(screen.getByText("42 results")).toBeDefined();
    });

    it("shows Running status during QUERY_ID_PENDING", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERY_ID_PENDING});
        });
        render(<QueryStatus/>);
        expect(screen.getByText("Running...")).toBeDefined();
    });

    it("shows Running with results during QUERYING", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "123",
                numSearchResultsTable: 10,
            });
        });
        render(<QueryStatus/>);
        expect(screen.getByText("Running...")).toBeDefined();
        expect(screen.getByText(/10 results so far/)).toBeDefined();
    });

    it("shows Done status when DONE", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.DONE,
                searchJobId: "123",
                numSearchResultsTable: 100,
            });
        });
        render(<QueryStatus/>);
        expect(screen.getByText("Done")).toBeDefined();
    });

    it("shows Failed status when FAILED", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.FAILED,
                searchJobId: "123",
            });
        });
        render(<QueryStatus/>);
        expect(screen.getByText("Failed")).toBeDefined();
    });

    it("shows job ID when querying", () => {
        act(() => {
            useSearchStore.setState({
                searchUiState: SEARCH_UI_STATE.QUERYING,
                searchJobId: "job-456",
            });
        });
        render(<QueryStatus/>);
        expect(screen.getByText(/job-456/)).toBeDefined();
    });

    it("calls start when entering QUERY_ID_PENDING", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERY_ID_PENDING});
        });
        render(<QueryStatus/>);
        expect(mockStart).toHaveBeenCalled();
    });

    it("calls stop when entering DONE", () => {
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.DONE});
        });
        render(<QueryStatus/>);
        expect(mockStop).toHaveBeenCalled();
    });

    it("renders progress bar when progress is non-null during QUERYING", () => {
        mockProgress = 50;
        act(() => {
            useSearchStore.setState({searchUiState: SEARCH_UI_STATE.QUERYING});
        });
        const {container} = render(<QueryStatus/>);
        const progressBar = container.querySelector("[style*='width: 50%']");
        expect(progressBar).not.toBeNull();
    });
});
