import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";


export type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    resolvedTheme: "dark" | "light";
    setTheme: (newTheme: Theme) => void;
    theme: Theme;
};

const SENTINEL: ThemeProviderState = {
    resolvedTheme: "light",
    setTheme: () => null,
    theme: "system",
};

const ThemeProviderContext = createContext<ThemeProviderState>(SENTINEL);

/**
 * Provides theme state to the component tree.
 *
 * @param root0
 * @param root0.children
 * @param root0.defaultTheme
 * @param root0.storageKey
 * @return
 */
export const ThemeProvider = ({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) => {
    const [theme, setTheme] = useState<Theme>(
        () => {
            const stored = localStorage.getItem(storageKey);
            const validThemes: Theme[] = [
                "dark",
                "light",
                "system",
            ];

            if (stored && validThemes.includes(stored as Theme)) {
                return stored as Theme;
            }

            return defaultTheme;
        }
    );

    const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(
        () => {
            if ("system" === theme) {
                return window.matchMedia("(prefers-color-scheme: dark)").matches ?
                    "dark" :
                    "light";
            }

            return theme;
        }
    );

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove("light", "dark");

        if ("system" === theme) {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const applySystemTheme = () => {
                root.classList.remove("light", "dark");
                const resolved = mediaQuery.matches ?
                    "dark" :
                    "light";

                root.classList.add(resolved);
                setResolvedTheme(resolved);
            };

            applySystemTheme();
            mediaQuery.addEventListener("change", applySystemTheme);

            return () => {
                mediaQuery.removeEventListener("change", applySystemTheme);
            };
        }

        root.classList.add(theme);
        setResolvedTheme(theme);

        return () => {
        };
    }, [theme]);

    const value: ThemeProviderState = {
        resolvedTheme: resolvedTheme,
        setTheme: (newTheme: Theme) => {
            localStorage.setItem(storageKey, newTheme);
            setTheme(newTheme);
        },
        theme: theme,
    };

    return (
        <ThemeProviderContext.Provider
            {...props}
            value={value}
        >
            {children}
        </ThemeProviderContext.Provider>
    );
};

export const useTheme = (): ThemeProviderState => {
    const context = useContext(ThemeProviderContext);


    if (context === SENTINEL) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
};
