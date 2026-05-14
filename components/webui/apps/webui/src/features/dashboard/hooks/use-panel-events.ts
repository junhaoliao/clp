import {
    useCallback,
    useEffect,
} from "react";

import {
    type PanelEvent,
    panelEventBus,
} from "./panel-event-bus";


/**
 *
 * @param eventType
 * @param handler
 */
export function usePanelEvent (
    eventType: string,
    handler: (event: PanelEvent) => void,
) {
    useEffect(() => {
        const unsub = panelEventBus.on(eventType, handler);
        return unsub;
    }, [eventType,
        handler]);
}

/**
 *
 * @param sourcePanelId
 */
export function useEmitPanelEvent (sourcePanelId: string) {
    return useCallback(
        (type: string, payload: Record<string, unknown> = {}) => {
            panelEventBus.emit({type, sourcePanelId, payload});
        },
        [sourcePanelId],
    );
}
