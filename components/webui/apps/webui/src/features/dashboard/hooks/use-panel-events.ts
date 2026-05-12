import {useEffect, useCallback} from "react";
import {panelEventBus, type PanelEvent} from "./panel-event-bus";

export function usePanelEvent(
  eventType: string,
  handler: (event: PanelEvent) => void,
) {
  useEffect(() => {
    const unsub = panelEventBus.on(eventType, handler);
    return unsub;
  }, [eventType, handler]);
}

export function useEmitPanelEvent(sourcePanelId: string) {
  return useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
      panelEventBus.emit({type, sourcePanelId, payload});
    },
    [sourcePanelId],
  );
}
