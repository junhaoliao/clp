import {
    useMemo,
    useState,
} from "react";
import type {ReactNode} from "react";
import {
    Outlet,
    Link,
    useLocation,
} from "react-router";

import {AppSidebar} from "@/components/app-sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {Separator} from "@/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    BreadcrumbTitleProvider,
    useBreadcrumbTitle,
} from "@/hooks/use-breadcrumb-title";
import {
    HeaderActionsProvider,
    useHeaderActions,
} from "@/hooks/use-header-actions";


const routeTitles: Record<string, string> = {
    "/dashboards": "Dashboards",
    "/ingest": "Ingest",
    "/ingest-new": "Ingest Overview",
    "/search": "Explore",
    "/settings": "Settings",
};

/**
 *
 */
const LayoutContent = () => {
    const {pathname} = useLocation();
    const {title: dynamicTitle} = useBreadcrumbTitle();
    const {actions: headerActions} = useHeaderActions();

    const isDashboardDetail = pathname.startsWith("/dashboards/") && "/dashboards" !== pathname;

    const breadcrumbItems = useMemo(() => {
        if (isDashboardDetail) {
            return [
                {label: "Dashboards", path: "/dashboards"},
                {label: dynamicTitle || "Dashboard", path: ""},
            ];
        }

        return [{label: routeTitles[pathname] || "Page", path: ""}];
    }, [pathname,
        isDashboardDetail,
        dynamicTitle]);

    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <header className={"flex h-16 shrink-0 items-center gap-2"}>
                    <div className={"flex items-center gap-2 px-4"}>
                        <SidebarTrigger className={"-ml-1"}/>
                        <Separator
                            className={"mr-2 data-vertical:h-4 data-vertical:self-auto"}
                            orientation={"vertical"}
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                {breadcrumbItems.map((item, index) => (
                                    <span
                                        className={"flex items-center gap-1.5"}
                                        key={item.label}
                                    >
                                        {0 < index && <BreadcrumbSeparator/>}
                                        <BreadcrumbItem className={1 === breadcrumbItems.length ? undefined : "hidden md:block"}>
                                            {item.path ?
                                                <BreadcrumbLink asChild>
                                                    <Link to={item.path}>
                                                        {item.label}
                                                    </Link>
                                                </BreadcrumbLink> :
                                                <BreadcrumbPage>
                                                    {item.label}
                                                </BreadcrumbPage>
                                            }
                                        </BreadcrumbItem>
                                    </span>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    {headerActions && (
                        <div className={"ml-auto flex items-center gap-2 px-4"}>
                            {headerActions}
                        </div>
                    )}
                </header>
                <Outlet/>
            </SidebarInset>
        </SidebarProvider>
    );
};

/**
 *
 */
const MainLayout = () => {
    const [dynamicTitle, setDynamicTitle] = useState("");
    const [headerActions, setHeaderActions] = useState<ReactNode>(null);

    return (
        <BreadcrumbTitleProvider value={{title: dynamicTitle, setTitle: setDynamicTitle}}>
            <HeaderActionsProvider value={{actions: headerActions, setActions: setHeaderActions}}>
                <LayoutContent/>
            </HeaderActionsProvider>
        </BreadcrumbTitleProvider>
    );
};

export default MainLayout;
