import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";


type Theme = "dark" | "light" | "system";

interface ThemeProviderState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState>({
    theme: "system",
    setTheme: () => null,
});


/**
 *
 */
const getSystemTheme = (): "dark" | "light" => {
    if ("undefined" === typeof window) {
        return "light";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ?
        "dark" :
        "light";
};


/**
 *
 * @param root0
 * @param root0.children
 * @param root0.defaultTheme
 * @param root0.storageKey
 */
const ThemeProvider = ({
    children,
    defaultTheme = "system",
    storageKey = "clp-webui-theme",
}: {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if ("undefined" === typeof window) {
            return defaultTheme;
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return (localStorage.getItem(storageKey) as Theme) ?? defaultTheme;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        const effectiveTheme = "system" === theme ?
            getSystemTheme() :
            theme;

        root.classList.add(effectiveTheme);
    }, [theme]);

    const value = {
        theme: theme,
        setTheme: (newTheme: Theme) => {
            localStorage.setItem(storageKey, newTheme);
            setTheme(newTheme);
        },
    };

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
};


/**
 *
 */
const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (undefined === context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
};


export {
    ThemeProvider, useTheme,
};
