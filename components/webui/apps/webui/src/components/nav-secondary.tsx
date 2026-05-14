import {
    useLocation,
    useNavigate,
} from "react-router";

import {type LucideIcon} from "lucide-react";

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";


/**
 *
 * @param root0
 * @param root0.items
 */
export const NavSecondary = ({
    items,
    ...props
}: {
    items: {
        title: string;
        to: string;
        icon: LucideIcon;
    }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) => {
    const {pathname} = useLocation();
    const navigate = useNavigate();

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                                size={"sm"}
                                onClick={() => navigate(item.to)}
                            >
                                <item.icon/>
                                <span>
                                    {item.title}
                                </span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
};
