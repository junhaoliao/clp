import {
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";

import LogViewerLoadingPage from "./index";


// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockSearchParams = new URLSearchParams();

vi.mock("react-router", () => ({
    useSearchParams: () => [mockSearchParams],
}));

const mockMutate = vi.fn();
vi.mock("../../api", () => ({
    useExtractStreamFile: () => ({mutate: mockMutate}),
}));

vi.mock("../../components/dashboard/DashboardCard", () => ({
    DashboardCard: ({title, children}: {
        title: string;
        children: React.ReactNode;
    }) => (
        <div data-testid={"dashboard-card"}>
            <h2>{title}</h2>
            {children}
        </div>
    ),
}));


// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Renders the LogViewerLoadingPage component and returns the container.
 */
const renderComponent = () => {
    return render(<LogViewerLoadingPage/>);
};


// ── Tests ──────────────────────────────────────────────────────────────────────

describe("LogViewerLoadingPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchParams.delete("type");
        mockSearchParams.delete("streamId");
        mockSearchParams.delete("logEventIdx");
        mockSearchParams.delete("dataset");
    });

    afterEach(() => {
        cleanup();
    });


    // ── Error state: missing params ─────────────────────────────────────────

    test("shows error when all required params are missing", () => {
        renderComponent();

        expect(screen.getByText("Error")).toBeInTheDocument();
        expect(screen.getByText(
            "Missing required parameters: type, streamId, or logEventIdx.",
        ))
            .toBeInTheDocument();
    });

    test("shows error when streamId is missing", () => {
        mockSearchParams.set("type", "ir");
        mockSearchParams.set("logEventIdx", "42");

        renderComponent();

        expect(screen.getByText("Error")).toBeInTheDocument();
        expect(screen.getByText(
            "Missing required parameters: type, streamId, or logEventIdx.",
        ))
            .toBeInTheDocument();
    });

    test("shows error when type is missing", () => {
        mockSearchParams.set("streamId", "abc123");
        mockSearchParams.set("logEventIdx", "42");

        renderComponent();

        expect(screen.getByText("Error")).toBeInTheDocument();
        expect(screen.getByText(
            "Missing required parameters: type, streamId, or logEventIdx.",
        ))
            .toBeInTheDocument();
    });

    test("shows error when logEventIdx is missing", () => {
        mockSearchParams.set("type", "json");
        mockSearchParams.set("streamId", "abc123");

        renderComponent();

        expect(screen.getByText("Error")).toBeInTheDocument();
        expect(screen.getByText(
            "Missing required parameters: type, streamId, or logEventIdx.",
        ))
            .toBeInTheDocument();
    });


    // ── Error state: invalid logEventIdx ────────────────────────────────────

    test("shows error when logEventIdx is not a number", () => {
        mockSearchParams.set("type", "json");
        mockSearchParams.set("streamId", "abc123");
        mockSearchParams.set("logEventIdx", "invalid");

        renderComponent();

        expect(screen.getByText("Error")).toBeInTheDocument();
        expect(screen.getByText("Invalid logEventIdx parameter."))
            .toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });


    // ── Error state: unknown stream type ────────────────────────────────────

    test("shows error for unknown stream type", () => {
        mockSearchParams.set("type", "unknown");
        mockSearchParams.set("streamId", "abc123");
        mockSearchParams.set("logEventIdx", "42");

        renderComponent();

        expect(screen.getByText("Error")).toBeInTheDocument();
        expect(screen.getByText("Unknown stream type: unknown"))
            .toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });


    // ── Loading state ───────────────────────────────────────────────────────

    test("shows loading message and pulse animation with valid params", () => {
        mockSearchParams.set("type", "json");
        mockSearchParams.set("streamId", "abc123");
        mockSearchParams.set("logEventIdx", "42");

        // Keep mutate unresolved to stay in loading state.
        mockMutate.mockImplementation(() => {
            // Intentionally not calling callbacks.
        });

        const {container} = renderComponent();

        expect(screen.getByText("Loading")).toBeInTheDocument();
        expect(screen.getByText("Extracting stream file for log viewer..."))
            .toBeInTheDocument();

        // Verify the pulse animation element exists.
        expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });


    // ── Ready state (mutation success) ──────────────────────────────────────

    test("renders iframe with correct src when extraction succeeds", () => {
        mockSearchParams.set("type", "ir");
        mockSearchParams.set("streamId", "abc123");
        mockSearchParams.set("logEventIdx", "42");

        mockMutate.mockImplementation(
            (_args: unknown, opts: {onSuccess: (data: {path: string}) => void}) => {
                opts.onSuccess({path: "/tmp/extracted/file.ir"});
            },
        );

        const {container} = renderComponent();

        const iframe = container.querySelector("iframe");
        expect(iframe).not.toBeNull();
        expect(iframe?.getAttribute("src")).toBe(
            "/log-viewer/index.html?filePath=%2Ftmp%2Fextracted%2Ffile.ir#logEventNum=42",
        );
        expect(iframe?.getAttribute("title")).toBe("Log Viewer");
        // jsdom normalizes "border: none" to "border: medium" so we check
        // that the essential styles are present rather than matching exactly.
        const style = iframe?.getAttribute("style") ?? "";
        expect(style).toContain("width: 100%");
        expect(style).toContain("height: 100%");
    });

    test("renders iframe with correct logEventNum from logEventIdx", () => {
        mockSearchParams.set("type", "json");
        mockSearchParams.set("streamId", "xyz789");
        mockSearchParams.set("logEventIdx", "100");

        mockMutate.mockImplementation(
            (_args: unknown, opts: {onSuccess: (data: {path: string}) => void}) => {
                opts.onSuccess({path: "/data/stream.json"});
            },
        );

        const {container} = renderComponent();

        const iframe = container.querySelector("iframe");
        expect(iframe?.getAttribute("src")).toContain("#logEventNum=100");
        expect(iframe?.getAttribute("src")).toContain(
            "filePath=%2Fdata%2Fstream.json",
        );
    });


    // ── Mutation error ──────────────────────────────────────────────────────

    test("shows error message when extraction fails", () => {
        mockSearchParams.set("type", "json");
        mockSearchParams.set("streamId", "abc123");
        mockSearchParams.set("logEventIdx", "42");

        mockMutate.mockImplementation(
            (_args: unknown, opts: {onError: (err: Error) => void}) => {
                opts.onError(new Error("Stream file extraction failed: 500"));
            },
        );

        renderComponent();

        expect(screen.getByText("Error")).toBeInTheDocument();
        expect(screen.getByText("Stream file extraction failed: 500"))
            .toBeInTheDocument();
    });


    // ── Dataset parameter ───────────────────────────────────────────────────

    test("passes dataset to mutate when provided", () => {
        mockSearchParams.set("type", "json");
        mockSearchParams.set("streamId", "abc123");
        mockSearchParams.set("logEventIdx", "42");
        mockSearchParams.set("dataset", "my-dataset");

        mockMutate.mockImplementation(
            (_args: unknown, opts: {onSuccess: (data: {path: string}) => void}) => {
                opts.onSuccess({path: "/extracted/file.json"});
            },
        );

        renderComponent();

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({dataset: "my-dataset"}),
            expect.any(Object),
        );
    });

    test("passes null dataset when not provided", () => {
        mockSearchParams.set("type", "ir");
        mockSearchParams.set("streamId", "abc123");
        mockSearchParams.set("logEventIdx", "42");

        mockMutate.mockImplementation(
            (_args: unknown, opts: {onSuccess: (data: {path: string}) => void}) => {
                opts.onSuccess({path: "/extracted/file.ir"});
            },
        );

        renderComponent();

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({dataset: null}),
            expect.any(Object),
        );
    });


    // ── Mutate call payload ─────────────────────────────────────────────────

    test("calls mutate with correct extractJobType for 'ir' stream type", () => {
        mockSearchParams.set("type", "ir");
        mockSearchParams.set("streamId", "stream1");
        mockSearchParams.set("logEventIdx", "10");

        mockMutate.mockImplementation(
            (_args: unknown, opts: {onSuccess: (data: {path: string}) => void}) => {
                opts.onSuccess({path: "/file.ir"});
            },
        );

        renderComponent();

        // EXTRACT_IR = 1
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                extractJobType: 1,
                logEventIdx: 10,
                streamId: "stream1",
            }),
            expect.any(Object),
        );
    });

    test("calls mutate with correct extractJobType for 'json' stream type", () => {
        mockSearchParams.set("type", "json");
        mockSearchParams.set("streamId", "stream2");
        mockSearchParams.set("logEventIdx", "99");

        mockMutate.mockImplementation(
            (_args: unknown, opts: {onSuccess: (data: {path: string}) => void}) => {
                opts.onSuccess({path: "/file.json"});
            },
        );

        renderComponent();

        // EXTRACT_JSON = 2
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                extractJobType: 2,
                logEventIdx: 99,
                streamId: "stream2",
            }),
            expect.any(Object),
        );
    });
});
