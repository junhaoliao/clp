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
    theme: Theme;
    setTheme: (newTheme: Theme) => void;
};

const SENTINEL: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
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

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove("light", "dark");

        if ("system" === theme) {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const applySystemTheme = () => {
                root.classList.remove("light", "dark");
                root.classList.add(
                    mediaQuery.matches ?
                        "dark" :
                        "light"
                );
            };

            applySystemTheme();
            mediaQuery.addEventListener("change", applySystemTheme);

            return () => {
                mediaQuery.removeEventListener("change", applySystemTheme);
            };
        }

        root.classList.add(theme);

        return () => {
        };
    }, [theme]);

    const value: ThemeProviderState = {
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
