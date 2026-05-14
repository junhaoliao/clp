import type {ReactNode} from "react";
import {
    createContext,
    useContext,
} from "react";


const HeaderActionsContext = createContext<{
    actions: ReactNode;
    setActions: (actions: ReactNode) => void;
}>({actions: null,
    setActions: () => {
    }});

export const HeaderActionsProvider = HeaderActionsContext.Provider;

/**
 *
 */
export function useHeaderActions () {
    return useContext(HeaderActionsContext);
}
