import {RouterProvider} from "react-router";

import {QueryClientProvider} from "@tanstack/react-query";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import {ConfigProvider, theme} from "antd";

import {ThemeProvider, useTheme} from "./components/theme-provider";
import queryClient from "./config/queryClient";
import router from "./router";
import THEME_CONFIG from "./theme";


/**
 * Connects Ant Design's theme algorithm to the resolved CLPP theme.
 *
 * @return
 */
const AntdThemeBridge = () => {
    const {resolvedTheme} = useTheme();

    const antdTheme: typeof THEME_CONFIG = {
        ...THEME_CONFIG,
        algorithm: "dark" === resolvedTheme ?
            theme.darkAlgorithm :
            theme.defaultAlgorithm,
    };

    return (
        <ConfigProvider theme={antdTheme}>
            <RouterProvider router={router}/>
        </ConfigProvider>
    );
};

/**
 * Renders Web UI app.
 *
 * @return
 */
const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                defaultTheme={"system"}
                storageKey={"clpp-ui-theme"}
            >
                <AntdThemeBridge/>
            </ThemeProvider>
            <ReactQueryDevtools initialIsOpen={false}/>
        </QueryClientProvider>
    );
};

export default App;
