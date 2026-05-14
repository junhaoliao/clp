import {
    Monitor,
    Moon,
    Sun,
} from "lucide-react";

import {useTheme} from "@/components/theme-provider";
import {SidebarMenuButton} from "@/components/ui/sidebar";


/**
 * Toggles between system theme and the opposite (fixed) theme.
 *
 * @return
 */
export const ModeToggle = () => {
    const {theme, setTheme} = useTheme();

    const toggleTheme = () => {
        if ("system" === theme) {
            const systemIsDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

            setTheme(systemIsDark ?
                "light" :
                "dark");
        } else {
            setTheme("system");
        }
    };

    const label: string = (() => {
        if ("light" === theme) {
            return "Light (fixed)";
        } else if ("dark" === theme) {
            return "Dark (fixed)";
        }

        return "System";
    })();

    return (
        <SidebarMenuButton
            size={"sm"}
            tooltip={label}
            onClick={toggleTheme}
        >
            {"system" === theme && <Monitor/>}
            {"light" === theme && <Sun/>}
            {"dark" === theme && <Moon/>}
            <span>
                {label}
            </span>
        </SidebarMenuButton>
    );
};
