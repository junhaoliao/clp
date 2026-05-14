import * as React from "react";
import {Link} from "react-router";

import {
    LayoutDashboard,
    Search,
    Settings,
    Upload,
} from "lucide-react";

import {ModeToggle} from "@/components/mode-toggle";
import {NavMain} from "@/components/nav-main";
import {NavSecondary} from "@/components/nav-secondary";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";


const data = {
    navMain: [
        {
            title: "Ingest",
            to: "/ingest",
            icon: Upload,
        },
        {
            title: "Ingest (new)",
            to: "/ingest-new",
            icon: Upload,
        },
        {
            title: "Explore",
            to: "/search",
            icon: Search,
        },
        {
            title: "Dashboards",
            to: "/dashboards",
            icon: LayoutDashboard,
        },
    ],
    navSecondary: [
        {
            title: "Settings",
            to: "/settings",
            icon: Settings,
        },
    ],
};

/**
 * Application sidebar component.
 *
 * @param root0
 * @return
 */
export const AppSidebar = ({...props}: React.ComponentProps<typeof Sidebar>) => {
    return (
        <Sidebar
            variant={"inset"}
            {...props}
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            render={<Link to={"/"}/>}
                            size={"lg"}
                        >
                            <div
                                className={
                                    "flex aspect-square size-8 items-center" +
                                " justify-center rounded-lg"
                                }
                            >
                                <img
                                    alt={"YScope Logo"}
                                    className={"size-8"}
                                    src={"/favicon.svg"}/>
                            </div>
                            <div className={"grid flex-1 text-left text-sm leading-tight"}>
                                <span className={"truncate font-medium"}>CLP</span>
                                <span className={"truncate text-xs"}>Log Processing</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain}/>
                <SidebarGroup className={"mt-auto"}>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <ModeToggle/>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <NavSecondary items={data.navSecondary}/>
            </SidebarContent>
        </Sidebar>
    );
};
