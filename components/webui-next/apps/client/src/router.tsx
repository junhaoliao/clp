import {
    createBrowserRouter,
    Navigate,
} from "react-router";

import MainLayout from "./components/layout/MainLayout";
import IngestPage from "./pages/IngestPage";
import LogViewerLoadingPage from "./pages/LogViewerLoadingPage";
import SearchPage from "./pages/SearchPage";


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
        ],
    },
    {
        path: "/streamFile",
        Component: LogViewerLoadingPage,
    },
]);


export default router;
