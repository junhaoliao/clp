import {
    Moon,
    Sun,
    SunMoon,
} from "lucide-react";

import {useTheme} from "@/components/theme-provider";
import {SidebarMenuButton} from "@/components/ui/sidebar";


/**
 * Cycles through theme states:
 * system → opposite of system (fixed) → same as system (fixed) → system.
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
            const systemIsDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;
            const systemTheme = systemIsDark ?
                "dark" :
                "light";

            if (theme !== systemTheme) {
                setTheme(systemTheme);
            } else {
                setTheme("system");
            }
        }
    };

    const label: string = (() => {
        if ("light" === theme) {
            return "Light";
        } else if ("dark" === theme) {
            return "Dark";
        }

        return "System";
    })();

    return (
        <SidebarMenuButton
            size={"sm"}
            tooltip={label}
            onClick={toggleTheme}
        >
            {"system" === theme && <SunMoon/>}
            {"light" === theme && <Sun/>}
            {"dark" === theme && <Moon/>}
            <span>
                {label}
            </span>
        </SidebarMenuButton>
    );
};
