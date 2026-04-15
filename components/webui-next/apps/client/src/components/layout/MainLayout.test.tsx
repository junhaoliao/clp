import {MemoryRouter} from "react-router";

import {
    render,
    screen,
} from "@testing-library/react";
import {
    describe,
    expect,
    test,
    vi,
} from "vitest";


// Mock the Sidebar to simplify MainLayout tests
vi.mock("./Sidebar", () => ({
    Sidebar: () => <div data-testid={"sidebar"}>Sidebar</div>,
}));

import MainLayout from "./MainLayout";


/**
 *
 * @param initialPath
 */
const renderWithRouter = (initialPath = "/ingest") => {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <MainLayout/>
        </MemoryRouter>
    );
};

describe("MainLayout", () => {
    test("renders sidebar and main content area", () => {
        renderWithRouter();

        const sidebars = screen.getAllByTestId("sidebar");
        expect(sidebars.length).toBeGreaterThanOrEqual(1);
        const mains = screen.getAllByRole("main");
        expect(mains.length).toBeGreaterThanOrEqual(1);
    });

    test("main content area is scrollable", () => {
        renderWithRouter();

        const mains = screen.getAllByRole("main");
        expect(mains[0]).toHaveClass("overflow-auto");
    });

    test("layout container exists", () => {
        renderWithRouter();

        const sidebars = screen.getAllByTestId("sidebar");
        const parent = sidebars[0]!.parentElement;
        expect(parent).toBeTruthy();
    });
});
