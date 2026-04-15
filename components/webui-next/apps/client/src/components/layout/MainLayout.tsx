import {Outlet} from "react-router";

import {Sidebar} from "./Sidebar";


/**
 * The main layout of the CLP Web UI with a sidebar and content area.
 *
 * @return
 */
const MainLayout = () => {
    return (
        <div className={"flex h-screen bg-background text-foreground"}>
            <Sidebar/>
            <main className={"flex flex-1 flex-col min-h-0 overflow-auto"}>
                <Outlet/>
            </main>
        </div>
    );
};


export default MainLayout;
