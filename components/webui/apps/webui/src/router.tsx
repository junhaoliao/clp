import {
    createBrowserRouter,
    Navigate,
} from "react-router";

import MainLayout from "./components/Layout/MainLayout";
import {DashboardListPage} from "./pages/DashboardListPage";
import {DashboardPage} from "./pages/DashboardPage";
import ExplorePage from "./pages/ExplorePage";
import IngestNewPage from "./pages/IngestNewPage";
import IngestPage from "./pages/IngestPage";
import QueryStatus from "./pages/LogViewerLoadingPage/QueryStatus";
import SettingsPage from "./pages/SettingsPage";


const router = createBrowserRouter([
    {
        path: "/",
        Component: MainLayout,
        children: [
            {
                path: "/",
                element: <Navigate
                    replace={true}
                    to={"/ingest"}/>,
            },
            {path: "ingest", Component: IngestPage},
            {path: "ingest-new", Component: IngestNewPage},
            {path: "search", Component: ExplorePage},
            {path: "settings", Component: SettingsPage},
            {path: "dashboards", Component: DashboardListPage},
            {path: "dashboards/:uid", Component: DashboardPage},
        ],
    },
    {
        path: "/streamFile",
        Component: QueryStatus,
    },
]);


export default router;
