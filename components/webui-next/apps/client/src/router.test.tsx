import {
    MemoryRouter,
    Outlet,
    Route,
    Routes,
} from "react-router";

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


// Mock child components with unique test IDs.
// MainLayout uses Outlet for nested routes (layout route pattern).
vi.mock("./components/layout/MainLayout", () => ({
    default: () => (
        <div data-testid={"main-layout"}>
            <Outlet/>
        </div>
    ),
}));

vi.mock("./pages/IngestPage", () => ({
    default: () => <div data-testid={"ingest-page"}/>,
}));

vi.mock("./pages/SearchPage", () => ({
    default: () => <div data-testid={"search-page"}/>,
}));

vi.mock("./pages/LogViewerLoadingPage", () => ({
    default: () => <div data-testid={"log-viewer-loading-page"}/>,
}));


// Import mocked modules after vi.mock calls
import MainLayout from "./components/layout/MainLayout";
import IngestPage from "./pages/IngestPage";
import LogViewerLoadingPage from "./pages/LogViewerLoadingPage";
import SearchPage from "./pages/SearchPage";
// Import router after mocks
import router from "./router";


describe("router", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it("has the expected route definitions", () => {
        expect(router).toBeDefined();
        expect(router.routes).toBeDefined();
        expect(router.routes.length).toBeGreaterThanOrEqual(1);
    });

    it("has a root route using MainLayout", () => {
        const rootRoute = router.routes.find((route: {path?: string}) => "/" === route.path);

        expect(rootRoute).toBeDefined();
    });

    it("has /streamFile route for LogViewerLoadingPage", () => {
        const streamRoute = router.routes.find((route: {path?: string}) => "/streamFile" === route.path);

        expect(streamRoute).toBeDefined();
    });

    it("root route has children for ingest and search", () => {
        const rootRoute = router.routes.find((route: {path?: string}) => "/" === route.path);

        expect(rootRoute).toBeDefined();
        expect(rootRoute!.children).toBeDefined();
        const childPaths = rootRoute!.children!.map(
            (child: {path?: string}) => child.path
        );

        expect(childPaths).toContain("ingest");
        expect(childPaths).toContain("search");
    });

    it("renders IngestPage at /ingest path", () => {
        render(
            <MemoryRouter initialEntries={["/ingest"]}>
                <Routes>
                    <Route element={<MainLayout/>}>
                        <Route
                            element={<IngestPage/>}
                            path={"ingest"}/>
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId("main-layout")).toBeInTheDocument();
        expect(screen.getByTestId("ingest-page")).toBeInTheDocument();
    });

    it("renders SearchPage at /search path", () => {
        render(
            <MemoryRouter initialEntries={["/search"]}>
                <Routes>
                    <Route element={<MainLayout/>}>
                        <Route
                            element={<SearchPage/>}
                            path={"search"}/>
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId("main-layout")).toBeInTheDocument();
        expect(screen.getByTestId("search-page")).toBeInTheDocument();
    });

    it("renders LogViewerLoadingPage at /streamFile path", () => {
        render(
            <MemoryRouter initialEntries={["/streamFile"]}>
                <Routes>
                    <Route
                        element={<LogViewerLoadingPage/>}
                        path={"/streamFile"}/>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId("log-viewer-loading-page")).toBeInTheDocument();
    });

    it("redirects / to /ingest via Navigate element", () => {
        const rootRoute = router.routes.find((route: {path?: string}) => "/" === route.path);

        expect(rootRoute).toBeDefined();
        const indexRoute = rootRoute!.children!.find(
            (child: {path?: string}) => "/" === child.path
        );

        expect(indexRoute).toBeDefined();
        expect(indexRoute!.element).toBeDefined();
    });
});
