import {RouterProvider} from "react-router";

import {QueryClientProvider} from "@tanstack/react-query";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import {ConfigProvider} from "antd";

import {ThemeProvider} from "./components/theme-provider";
import queryClient from "./config/queryClient";
import router from "./router";
import THEME_CONFIG from "./theme";


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
                <ConfigProvider
                    theme={THEME_CONFIG}
                >
                    <RouterProvider router={router}/>
                </ConfigProvider>
            </ThemeProvider>
            <ReactQueryDevtools initialIsOpen={false}/>
        </QueryClientProvider>
    );
};

export default App;
