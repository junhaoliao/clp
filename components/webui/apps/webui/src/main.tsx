import {StrictMode} from "react";
import {createRoot} from "react-dom/client";

import App from "./App";
import {initializePanelPlugins} from "./features/dashboard/plugins/init";

import "./index.css";


initializePanelPlugins();


const rootElement = document.getElementById("root");
if (null === rootElement) {
    throw new Error("Root element not found");
}


const root = createRoot(rootElement);
root.render(
    <StrictMode>
        <App/>
    </StrictMode>
);
