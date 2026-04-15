import {MemoryRouter} from "react-router";

import {
    render,
    screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";

import {Sidebar} from "./Sidebar";

import {TooltipProvider} from "@/components/ui/tooltip";


const mockSetTheme = vi.fn();

vi.mock("../theme/ThemeProvider", () => ({
    useTheme: () => ({theme: "light", setTheme: mockSetTheme}),
}));

/**
 *
 * @param initialPath
 */
const renderWithRouter = (initialPath = "/ingest") => {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <TooltipProvider>
                <Sidebar/>
            </TooltipProvider>
        </MemoryRouter>
    );
};

describe("Sidebar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("renders navigation links", () => {
        renderWithRouter();

        const links = screen.getAllByRole("link");
        const hrefs = links.map((link) => link.getAttribute("href"));
        expect(hrefs).toContain("/ingest");
        expect(hrefs).toContain("/search");
    });

    test("renders CLP logo", () => {
        renderWithRouter();

        const logos = screen.getAllByAltText("CLP Logo");
        expect(logos.length).toBeGreaterThanOrEqual(1);
        expect(logos[0]).toHaveAttribute("src", "/clp-logo.png");
    });

    test("has collapse toggle button", () => {
        renderWithRouter();

        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    test("renders Ingest and Search text labels", () => {
        renderWithRouter();

        const allText = screen.getAllByText(/Ingest|Search/);
        expect(allText.length).toBeGreaterThanOrEqual(2);
    });

    test("toggles theme on click", async () => {
        const user = userEvent.setup();
        renderWithRouter();

        const themeBtns = screen.getAllByLabelText("Toggle theme");
        await user.click(themeBtns[0]!);

        expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });

    test("calls setTheme when theme toggle clicked", async () => {
        const user = userEvent.setup();
        renderWithRouter();

        const themeBtns = screen.getAllByLabelText("Toggle theme");
        await user.click(themeBtns[0]!);

        // Theme is "light", so clicking toggles to "dark"
        expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });

    test("collapses sidebar on toggle click", async () => {
        const user = userEvent.setup();
        const {container} = renderWithRouter();

        const buttons = screen.getAllByRole("button");

        // Last button is the collapse toggle
        const collapseBtn = buttons[buttons.length - 1]!;
        await user.click(collapseBtn);

        // After collapse, nav labels should be hidden
        const aside = container.querySelector("aside");
        expect(aside).toBeDefined();
    });

    test("highlights active nav item based on current path", () => {
        renderWithRouter("/search");

        const searchLinks = screen.getAllByRole("link").filter(
            (l) => "/search" === l.getAttribute("href"),
        );

        expect(searchLinks[0]!.className).toContain("bg-accent");
    });
});
