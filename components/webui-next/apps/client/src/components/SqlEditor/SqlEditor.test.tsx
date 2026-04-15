import {
    act,
    cleanup,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";


const mockSetTheme = vi.fn();
const mockDefineTheme = vi.fn();

// Mock monaco-editor before importing SqlEditor
vi.mock("monaco-editor/esm/vs/editor/editor.api.js", () => ({
    editor: {
        defineTheme: mockDefineTheme,
        setTheme: mockSetTheme,
    },
}));

vi.mock("monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js", () => ({}));

vi.mock("monaco-editor/esm/vs/editor/editor.worker?worker", () => ({
    default: class MockWorker {
        constructor () {/* no-op */}
    },
}));

vi.mock("@monaco-editor/react", () => ({
    default: vi.fn(({
        value,
        language,
    }: {
        value?: string;
        language?: string;
    }) => (
        <div
            data-language={language}
            data-testid={"monaco-editor"}
        >
            {value}
        </div>
    )),
    useMonaco: () => ({
        editor: {
            defineTheme: mockDefineTheme,
            setTheme: mockSetTheme,
        },
    }),
    loader: {
        config: vi.fn(),
    },
}));

// Import after mocks
import SqlEditor from "./SqlEditor";


describe("SqlEditor", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        document.documentElement.classList.remove("dark");
    });

    it("renders the editor with SQL language", () => {
        render(
            <SqlEditor
                value={"SELECT * FROM table"}
                onChange={() => {
                }}/>
        );
        const editor = screen.getByTestId("monaco-editor");
        expect(editor).toBeDefined();
        expect(editor.getAttribute("data-language")).toBe("sql");
    });

    it("displays the current value", () => {
        render(
            <SqlEditor
                value={"SELECT 1"}
                onChange={() => {
                }}/>
        );
        const editor = screen.getByTestId("monaco-editor");
        expect(editor.textContent).toBe("SELECT 1");
    });

    it("applies disabled styling when disabled", () => {
        const {container} = render(
            <SqlEditor
                disabled={true}
                value={""}
                onChange={() => {
                }}/>,
        );
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain("opacity-50");
    });

    it("has proper height style", () => {
        const {container} = render(
            <SqlEditor
                height={200}
                value={""}
                onChange={() => {
                }}/>,
        );
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.style.height).toBe("200px");
    });

    it("has ring styling when focused class would apply", () => {
        const {container} = render(
            <SqlEditor
                value={"test"}
                onChange={() => {
                }}/>,
        );
        const wrapper = container.firstChild as HTMLElement;

        // Should have border class (non-focused state)
        expect(wrapper.className).toContain("border");
    });

    it("responds to theme change via MutationObserver (light to dark)", async () => {
        render(
            <SqlEditor
                value={""}
                onChange={() => {
                }}/>
        );

        // Clear calls from the initial render/mount effect
        mockSetTheme.mockClear();

        // Simulate adding "dark" class to documentElement
        act(() => {
            document.documentElement.classList.add("dark");
        });

        // MutationObserver may fire asynchronously in jsdom
        await waitFor(() => {
            expect(mockSetTheme).toHaveBeenCalledWith("clp-dark");
        });
    });

    it("responds to theme change via MutationObserver (dark to light)", async () => {
        document.documentElement.classList.add("dark");
        render(
            <SqlEditor
                value={""}
                onChange={() => {
                }}/>
        );

        mockSetTheme.mockClear();

        // Simulate removing "dark" class
        act(() => {
            document.documentElement.classList.remove("dark");
        });

        await waitFor(() => {
            expect(mockSetTheme).toHaveBeenCalledWith("clp-light");
        });
    });

    it("uses clp-disabled theme in MutationObserver callback when disabled", async () => {
        render(
            <SqlEditor
                disabled={true}
                value={""}
                onChange={() => {
                }}/>
        );

        mockSetTheme.mockClear();

        // Trigger MutationObserver callback by toggling dark class
        act(() => {
            document.documentElement.classList.add("dark");
        });

        await waitFor(() => {
            // Even though dark mode is toggled, disabled should override
            expect(mockSetTheme).toHaveBeenCalledWith("clp-disabled");
        });
    });
});
