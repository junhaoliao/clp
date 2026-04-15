import {
    cleanup,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";

import {PathsSelect} from "./PathsSelect";


// Mock lucide-react icons as simple text spans
vi.mock("lucide-react", () => ({
    Folder: ({className}: {className?: string}) => (
        <span
            className={className}
            data-testid={"folder-icon"}
        >
            Folder
        </span>
    ),
    File: ({className}: {className?: string}) => (
        <span
            className={className}
            data-testid={"file-icon"}
        >
            File
        </span>
    ),
    ChevronRight: ({className}: {className?: string}) => (
        <span
            className={className}
            data-testid={"chevron-right"}
        >
            &gt;
        </span>
    ),
    ChevronDown: ({className}: {className?: string}) => (
        <span
            className={className}
            data-testid={"chevron-down"}
        >
            v
        </span>
    ),
    ChevronUp: ({className}: {className?: string}) => (
        <span
            className={className}
            data-testid={"chevron-up"}
        >
            ^
        </span>
    ),
    X: ({className, onClick}: {className?: string; onClick?: (e: any) => void}) => (
        <span
            className={className}
            data-testid={"x-icon"}
            onClick={onClick}
        >
            x
        </span>
    ),
}));


// Fetch mock helper
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);


describe("PathsSelect", () => {
    const onPathsChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    test("renders select trigger with placeholder text", () => {
        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );
        expect(screen.getByText("Select files or directories...")).toBeDefined();
    });

    test("shows selected paths as tags in trigger", () => {
        render(
            <PathsSelect
                paths={["/file1.log",
                    "/file2.log"]}
                onPathsChange={onPathsChange}/>,
        );

        expect(screen.getByText("/file1.log")).toBeDefined();
        expect(screen.getByText("/file2.log")).toBeDefined();
    });

    test("removes a path when clicking X on tag", async () => {
        const user = userEvent.setup();
        render(
            <PathsSelect
                paths={["/file1.log"]}
                onPathsChange={onPathsChange}/>,
        );

        const xIcons = screen.getAllByTestId("x-icon");
        await user.click(xIcons[0]!);

        expect(onPathsChange).toHaveBeenCalledWith([]);
    });

    test("opens dropdown on click and loads root directory", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: true, name: "dir1", parentPath: "/"},
                {isExpandable: false, name: "file1.log", parentPath: "/"},
            ],
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        // Click the trigger to open
        await user.click(screen.getByText("Select files or directories..."));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                "/api/os/ls?path=%2F",
            );
        });

        await waitFor(() => {
            expect(screen.getByText("dir1")).toBeDefined();
            expect(screen.getByText("file1.log")).toBeDefined();
        });
    });

    test("shows error when root directory fetch fails", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({error: "Internal Server Error"}),
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        await user.click(screen.getByText("Select files or directories..."));

        await waitFor(() => {
            expect(
                screen.getByText(/Cannot load "\/": Internal Server Error/),
            ).toBeDefined();
        });
    });

    test("closes dropdown when clicking outside", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        // Open
        await user.click(screen.getByText("Select files or directories..."));

        // The chevron-up icon is shown when open
        await waitFor(() => {
            expect(screen.getByTestId("chevron-up")).toBeDefined();
        });

        // Click outside
        await user.click(document.body);

        await waitFor(() => {
            expect(screen.queryByTestId("chevron-up")).toBeNull();
        });
    });

    test("toggles path selection when clicking a file name", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: false, name: "file1.log", parentPath: "/"},
            ],
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        await user.click(screen.getByText("Select files or directories..."));

        await waitFor(() => {
            expect(screen.getByText("file1.log")).toBeDefined();
        });

        // Click the file name to select it
        await user.click(screen.getByText("file1.log"));

        expect(onPathsChange).toHaveBeenCalledWith(["/file1.log"]);
    });

    test("deselects a path when clicking an already-selected file", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: false, name: "file1.log", parentPath: "/"},
            ],
        });

        render(
            <PathsSelect
                paths={["/file1.log"]}
                onPathsChange={onPathsChange}/>,
        );

        await user.click(screen.getByText("/file1.log"));

        await waitFor(() => {
            expect(screen.getByText("file1.log")).toBeDefined();
        });

        // Click the file in the dropdown to deselect
        const fileButtons = screen.getAllByRole("button", {name: "file1.log"});
        await user.click(fileButtons[fileButtons.length - 1]!);

        expect(onPathsChange).toHaveBeenCalledWith([]);
    });

    test("sorts directories before files", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: false, name: "b_file.log", parentPath: "/"},
                {isExpandable: true, name: "a_dir", parentPath: "/"},
                {isExpandable: true, name: "b_dir", parentPath: "/"},
                {isExpandable: false, name: "a_file.log", parentPath: "/"},
            ],
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        await user.click(screen.getByText("Select files or directories..."));

        await waitFor(() => {
            const items = screen.getAllByRole("listitem");
            expect(items.length).toBe(4);
        });

        // Verify ordering: directories (a_dir, b_dir) before files (a_file.log, b_file.log)
        const listItems = screen.getAllByRole("listitem");
        const names = listItems.map((li) => li.textContent);
        const dirIdx1 = names.findIndex((n) => n?.includes("a_dir"));
        const dirIdx2 = names.findIndex((n) => n?.includes("b_dir"));
        const fileIdx1 = names.findIndex((n) => n?.includes("a_file.log"));
        const fileIdx2 = names.findIndex((n) => n?.includes("b_file.log"));
        expect(dirIdx1).toBeLessThan(fileIdx1);
        expect(dirIdx2).toBeLessThan(fileIdx2);
    });

    test("expands a directory when clicking expand chevron", async () => {
        const user = userEvent.setup();

        // First call: root directory
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: true, name: "subdir", parentPath: "/"},
            ],
        });

        // Second call: expanding subdirectory
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: false, name: "nested.log", parentPath: "/subdir"},
            ],
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        await user.click(screen.getByText("Select files or directories..."));

        await waitFor(() => {
            expect(screen.getByText("subdir")).toBeDefined();
        });

        // Click the chevron to expand
        const chevron = screen.getByTestId("chevron-right");
        await user.click(chevron);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(screen.getByText("nested.log")).toBeDefined();
        });
    });

    test("collapses and re-expands a directory", async () => {
        const user = userEvent.setup();

        // Root load
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: true, name: "subdir", parentPath: "/"},
            ],
        });

        // Expand subdir
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: false, name: "nested.log", parentPath: "/subdir"},
            ],
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        await user.click(screen.getByText("Select files or directories..."));

        await waitFor(() => {
            expect(screen.getByText("subdir")).toBeDefined();
        });

        // Expand
        await user.click(screen.getByTestId("chevron-right"));

        await waitFor(() => {
            expect(screen.getByText("nested.log")).toBeDefined();
            expect(screen.getByTestId("chevron-down")).toBeDefined();
        });

        // Collapse
        await user.click(screen.getByTestId("chevron-down"));

        await waitFor(() => {
            expect(screen.queryByText("nested.log")).toBeNull();
        });

        // Re-expand — should NOT fetch again (already loaded)
        const chevron = screen.getByTestId("chevron-right");
        await user.click(chevron);

        await waitFor(() => {
            expect(screen.getByText("nested.log")).toBeDefined();
        });

        // Should still be only 2 fetch calls (root + first expand)
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test("does not expand a file node", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: false, name: "file.log", parentPath: "/"},
            ],
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        await user.click(screen.getByText("Select files or directories..."));

        await waitFor(() => {
            expect(screen.getByText("file.log")).toBeDefined();
        });

        // No chevron rendered for non-expandable nodes
        expect(screen.queryByTestId("chevron-right")).toBeNull();
        expect(screen.queryByTestId("chevron-down")).toBeNull();
    });

    test("handles fetch network error gracefully", async () => {
        const user = userEvent.setup();
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        await user.click(screen.getByText("Select files or directories..."));

        // Should not throw
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        // No error shown for network errors (only HTTP errors show)
        expect(screen.queryByText(/Cannot load/)).toBeNull();
    });

    test("collapseNode recurses into nested children", async () => {
        const user = userEvent.setup();

        // Root: contains dir1 and a sibling file
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: true, name: "dir1", parentPath: "/"},
                {isExpandable: false, name: "sibling.log", parentPath: "/"},
            ],
        });

        // Expand dir1: contains dir2
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: true, name: "dir2", parentPath: "/dir1"},
            ],
        });

        // Expand dir2: contains a file
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {isExpandable: false, name: "deep.log", parentPath: "/dir1/dir2"},
            ],
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        await user.click(screen.getByText("Select files or directories..."));

        // Expand dir1
        await waitFor(() => {
            expect(screen.getByText("dir1")).toBeDefined();
        });
        await user.click(screen.getByTestId("chevron-right"));

        // Expand dir2
        await waitFor(() => {
            expect(screen.getByText("dir2")).toBeDefined();
        });
        const chevrons = screen.getAllByTestId("chevron-right");
        await user.click(chevrons[chevrons.length - 1]!);

        await waitFor(() => {
            expect(screen.getByText("deep.log")).toBeDefined();
        });

        // Now collapse dir1 — recursive collapse should hide dir2 and deep.log
        const chevronDowns = screen.getAllByTestId("chevron-down");
        await user.click(chevronDowns[0]!);

        await waitFor(() => {
            expect(screen.queryByText("dir2")).toBeNull();
            expect(screen.queryByText("deep.log")).toBeNull();
        });

        // dir1 and sibling should still be visible
        expect(screen.getByText("dir1")).toBeDefined();
        expect(screen.getByText("sibling.log")).toBeDefined();
    });

    test("shows retry button when root is empty and not loaded", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        render(
            <PathsSelect
                paths={[]}
                onPathsChange={onPathsChange}/>
        );

        await user.click(screen.getByText("Select files or directories..."));

        // Shows the root path as a clickable retry button when tree is empty
        await waitFor(() => {
            expect(screen.getByText("/")).toBeDefined();
        });
    });
});
