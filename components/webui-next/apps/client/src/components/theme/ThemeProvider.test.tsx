import {
    act,
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    ThemeProvider,
    useTheme,
} from "./ThemeProvider";


// Helper component that reads and displays the current theme
/**
 *
 */
const ThemeDisplay = () => {
    const {theme, setTheme} = useTheme();
    return (
        <div>
            <span data-testid={"current-theme"}>
                {theme}
            </span>
            <button
                data-testid={"set-light"}
                onClick={() => {
                    setTheme("light");
                }}/>
            <button
                data-testid={"set-dark"}
                onClick={() => {
                    setTheme("dark");
                }}/>
            <button
                data-testid={"set-system"}
                onClick={() => {
                    setTheme("system");
                }}/>
        </div>
    );
};


/**
 * Mocks window.matchMedia for testing system theme resolution.
 *
 * @param prefersDark
 */
const mockMatchMedia = (prefersDark: boolean) => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: "(prefers-color-scheme: dark)" === query && prefersDark,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
};


describe("ThemeProvider", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove("light", "dark");
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it("renders children", () => {
        render(
            <ThemeProvider defaultTheme={"light"}>
                <div data-testid={"child"}>Hello</div>
            </ThemeProvider>
        );
        expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("applies light class to document root when defaultTheme is light", () => {
        render(
            <ThemeProvider defaultTheme={"light"}>
                <div/>
            </ThemeProvider>
        );
        expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("applies dark class to document root when defaultTheme is dark", () => {
        render(
            <ThemeProvider defaultTheme={"dark"}>
                <div/>
            </ThemeProvider>
        );
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("applies system-resolved dark class when defaultTheme is system and prefers dark", () => {
        mockMatchMedia(true);

        render(
            <ThemeProvider defaultTheme={"system"}>
                <div/>
            </ThemeProvider>
        );
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("applies system-resolved light class when defaultTheme is system and prefers light", () => {
        mockMatchMedia(false);

        render(
            <ThemeProvider defaultTheme={"system"}>
                <div/>
            </ThemeProvider>
        );
        expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("reads initial theme from localStorage when available", () => {
        localStorage.setItem("clp-webui-theme", "dark");

        render(
            <ThemeProvider defaultTheme={"light"}>
                <ThemeDisplay/>
            </ThemeProvider>
        );

        expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    });

    it("uses defaultTheme when localStorage has no value", () => {
        render(
            <ThemeProvider defaultTheme={"light"}>
                <ThemeDisplay/>
            </ThemeProvider>
        );

        expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
    });

    it("uses custom storageKey when provided", () => {
        localStorage.setItem("custom-key", "dark");

        render(
            <ThemeProvider
                defaultTheme={"light"}
                storageKey={"custom-key"}
            >
                <ThemeDisplay/>
            </ThemeProvider>
        );

        expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    });

    it("persists theme to localStorage when setTheme is called", () => {
        render(
            <ThemeProvider defaultTheme={"light"}>
                <ThemeDisplay/>
            </ThemeProvider>
        );

        act(() => {
            screen.getByTestId("set-dark").click();
        });

        expect(localStorage.getItem("clp-webui-theme")).toBe("dark");
        expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    });

    it("updates document root class when theme changes", () => {
        render(
            <ThemeProvider defaultTheme={"light"}>
                <ThemeDisplay/>
            </ThemeProvider>
        );

        expect(document.documentElement.classList.contains("light")).toBe(true);

        act(() => {
            screen.getByTestId("set-dark").click();
        });

        expect(document.documentElement.classList.contains("light")).toBe(false);
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes previous theme class before adding new one", () => {
        render(
            <ThemeProvider defaultTheme={"light"}>
                <ThemeDisplay/>
            </ThemeProvider>
        );

        expect(document.documentElement.classList.contains("light")).toBe(true);

        act(() => {
            screen.getByTestId("set-dark").click();
        });

        // Only dark should be present, not light
        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(document.documentElement.classList.contains("light")).toBe(false);
    });

    it("resolves system theme when switching to system", () => {
        mockMatchMedia(true);

        render(
            <ThemeProvider defaultTheme={"light"}>
                <ThemeDisplay/>
            </ThemeProvider>
        );

        act(() => {
            screen.getByTestId("set-system").click();
        });

        expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("provides theme and setTheme via context", () => {
        render(
            <ThemeProvider defaultTheme={"light"}>
                <ThemeDisplay/>
            </ThemeProvider>
        );

        // ThemeDisplay renders the current theme value
        expect(screen.getByTestId("current-theme")).toHaveTextContent("light");

        // Clicking the set-dark button calls setTheme from context
        act(() => {
            screen.getByTestId("set-dark").click();
        });

        expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    });

    it("returns default context values when useTheme is used outside ThemeProvider", () => {
        // When used outside a ThemeProvider, useTheme returns the default context
        // value: {theme: "system", setTheme: () => null}
        const OutsideConsumer = () => {
            const {theme, setTheme} = useTheme();
            return (
                <div>
                    <span data-testid={"outside-theme"}>
                        {theme}
                    </span>
                    <button
                        data-testid={"outside-set-theme"}
                        onClick={() => {
                            // This calls the default setTheme: () => null
                            const result = setTheme("dark");
                            expect(result).toBeNull();
                        }}/>
                </div>
            );
        };

        render(<OutsideConsumer/>);
        expect(screen.getByTestId("outside-theme")).toHaveTextContent("system");

        // Verify the default setTheme callback (line 13) executes without error
        act(() => {
            screen.getByTestId("outside-set-theme").click();
        });
    });
});
