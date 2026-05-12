import {
    createBrowserRouter,
    Navigate,
} from "react-router";

import MainLayout from "./components/Layout/MainLayout";
import IngestPage from "./pages/IngestPage";
import QueryStatus from "./pages/LogViewerLoadingPage/QueryStatus";
import SearchPage from "./pages/SearchPage";
import {DashboardPage} from "./pages/DashboardPage";
import {DashboardListPage} from "./pages/DashboardListPage";


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
            {path: "search", Component: SearchPage},
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
