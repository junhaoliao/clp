import {RouterProvider} from "react-router";

import {QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "sonner";

import {ErrorBoundary} from "./components/ErrorBoundary";
import {ThemeProvider} from "./components/theme/ThemeProvider";
import queryClient from "./config/queryClient";
import router from "./router";

import {TooltipProvider} from "@/components/ui/tooltip";


/**
 * Renders Web UI app.
 *
 * @return
 */
const App = () => {
    return (
        <ErrorBoundary>
            <ThemeProvider defaultTheme={"light"}>
                <QueryClientProvider client={queryClient}>
                    <TooltipProvider>
                        <RouterProvider router={router}/>
                    </TooltipProvider>
                    <Toaster
                        position={"bottom-right"}
                        richColors={true}/>
                </QueryClientProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
};

export default App;
