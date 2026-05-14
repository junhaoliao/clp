import {
    createContext,
    useContext,
} from "react";


const BreadcrumbTitleContext = createContext<{
    title: string;
    setTitle: (t: string) => void;
}>({title: "",
    setTitle: () => {
    }});

export const BreadcrumbTitleProvider = BreadcrumbTitleContext.Provider;

/**
 *
 */
export function useBreadcrumbTitle () {
    return useContext(BreadcrumbTitleContext);
}
