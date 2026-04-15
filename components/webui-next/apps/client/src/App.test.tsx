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
    it,
    vi,
} from "vitest";


// Mock react-router RouterProvider
vi.mock("react-router", () => ({
    RouterProvider: ({router}: {router: unknown}) => (
        <div
            data-router={String(router)}
            data-testid={"router-provider"}/>
    ),
}));

// Mock @tanstack/react-query QueryClientProvider
vi.mock("@tanstack/react-query", () => ({
    QueryClientProvider: ({children}: {children: React.ReactNode}) => (
        <div data-testid={"query-client-provider"}>
            {children}
        </div>
    ),
}));

// Mock sonner Toaster
vi.mock("sonner", () => ({
    Toaster: () => <div data-testid={"toaster"}/>,
}));

// Mock ThemeProvider to verify it receives correct props
vi.mock("./components/theme/ThemeProvider", () => ({
    ThemeProvider: ({
        children,
        defaultTheme,
    }: {
        children: React.ReactNode;
        defaultTheme?: string;
    }) => (
        <div
            data-default-theme={defaultTheme}
            data-testid={"theme-provider"}
        >
            {children}
        </div>
    ),
}));

// Mock the router module
vi.mock("./router", () => ({
    default: "mocked-router",
}));

// Mock queryClient
vi.mock("./config/queryClient", () => ({
    default: {},
}));


// Import App after mocks are set up
import App from "./App";


describe("App", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it("renders ThemeProvider with defaultTheme light", () => {
        render(<App/>);
        const themeProvider = screen.getByTestId("theme-provider");
        expect(themeProvider).toBeInTheDocument();
        expect(themeProvider).toHaveAttribute("data-default-theme", "light");
    });

    it("renders QueryClientProvider", () => {
        render(<App/>);
        expect(screen.getByTestId("query-client-provider")).toBeInTheDocument();
    });

    it("renders RouterProvider", () => {
        render(<App/>);
        expect(screen.getByTestId("router-provider")).toBeInTheDocument();
    });

    it("renders Toaster", () => {
        render(<App/>);
        expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });

    it("nests components in correct order: ThemeProvider > QueryClientProvider > RouterProvider", () => {
        render(<App/>);
        const themeProvider = screen.getByTestId("theme-provider");
        const queryClientProvider = screen.getByTestId("query-client-provider");
        const routerProvider = screen.getByTestId("router-provider");

        // QueryClientProvider is inside ThemeProvider
        expect(themeProvider).toContainElement(queryClientProvider);

        // RouterProvider is inside QueryClientProvider
        expect(queryClientProvider).toContainElement(routerProvider);
    });
});
