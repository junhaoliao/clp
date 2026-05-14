import {
    Link,
    useLocation,
} from "react-router";

import {type LucideIcon} from "lucide-react";

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";


/**
 *
 * @param root0
 * @param root0.items
 */
export const NavMain = ({
    items,
}: {
    items: {
        title: string;
        to: string;
        icon: LucideIcon;
    }[];
}) => {
    const {pathname} = useLocation();

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                            render={<Link to={item.to} />}
                            tooltip={item.title}
                        >
                            <item.icon/>
                            <span>
                                {item.title}
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
};
