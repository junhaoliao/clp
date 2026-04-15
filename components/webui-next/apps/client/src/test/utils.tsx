import React from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import type {RenderResult} from "@testing-library/react";
import {render as tlRender} from "@testing-library/react";


/**
 *
 */
const createTestQueryClient = () => {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
};


/**
 *
 * @param root0
 * @param root0.children
 */
const AllTheProviders = ({children}: {children: React.ReactNode}) => {
    const queryClient = createTestQueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};


/**
 *
 * @param ui
 * @param options
 */
const customRender = (ui: React.ReactElement, options?: any): RenderResult => {
    return tlRender(ui, {wrapper: AllTheProviders, ...options});
};


export {
    AllTheProviders, createTestQueryClient, customRender as render,
};
