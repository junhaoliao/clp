import {useState} from "react";
import {
    Link,
    useLocation,
} from "react-router";

import {
    Moon,
    PanelLeft,
    PanelLeftClose,
    Search,
    Sun,
    Upload,
} from "lucide-react";

import {useTheme} from "../theme/ThemeProvider";

import {Button} from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";


type NavItem = {
    href: string;
    icon: React.ReactNode;
    label: string;
};

const NAV_ITEMS: NavItem[] = [
    {href: "/ingest", icon: <Upload className={"h-4 w-4"}/>, label: "Ingest"},
    {href: "/search", icon: <Search className={"h-4 w-4"}/>, label: "Search"},
];

/**
 * Navigation sidebar with collapsible behaviour.
 *
 * @return
 */
const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const {theme, setTheme} = useTheme();

    return (
        <aside
            className={cn(
                "flex h-full flex-col border-r border-border bg-card transition-all duration-200",
                collapsed ?
                    "w-14" :
                    "w-[150px]",
            )}
        >
            {/* Logo area */}
            <div className={"flex h-12 items-center justify-center border-b border-border px-2"}>
                <img
                    alt={"CLP Logo"}
                    className={"h-7"}
                    src={"/clp-logo.png"}/>
            </div>

            {/* Navigation */}
            <nav className={"flex-1 py-2"}>
                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    const link = (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                isActive && "bg-accent text-accent-foreground font-medium",
                                collapsed && "justify-center px-2",
                            )}
                        >
                            {item.icon}
                            {!collapsed && (
                                <span>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );

                    if (collapsed) {
                        return (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild={true}>
                                    {link}
                                </TooltipTrigger>
                                <TooltipContent side={"right"}>
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        );
                    }

                    return link;
                })}
            </nav>

            {/* Theme toggle */}
            <Button
                aria-label={"Toggle theme"}
                size={"icon"}
                variant={"ghost"}
                className={
                    "flex items-center justify-center border-t border-border rounded-none " +
                    "text-muted-foreground hover:text-foreground"
                }
                onClick={() => {
                    setTheme("dark" === theme ?
                        "light" :
                        "dark");
                }}
            >
                {"dark" === theme ?
                    <Sun className={"h-4 w-4"}/> :
                    <Moon className={"h-4 w-4"}/>}
            </Button>

            {/* Collapse toggle */}
            <Button
                aria-label={"Toggle sidebar"}
                size={"icon"}
                variant={"ghost"}
                className={
                    "flex items-center justify-center border-t border-border rounded-none " +
                    "text-muted-foreground hover:text-foreground"
                }
                onClick={() => {
                    setCollapsed(!collapsed);
                }}
            >
                {collapsed ?
                    <PanelLeft className={"h-4 w-4"}/> :
                    <PanelLeftClose className={"h-4 w-4"}/>}
            </Button>
        </aside>
    );
};


export {Sidebar};
