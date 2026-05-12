type EventHandler = (event: PanelEvent) => void;

export interface PanelEvent {
  type: string;
  sourcePanelId: string;
  payload: Record<string, unknown>;
}

class PanelEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  emit(event: PanelEvent): void {
    this.handlers.get(event.type)?.forEach((handler) => handler(event));
  }

  removeAll(): void {
    this.handlers.clear();
  }
}

export const panelEventBus = new PanelEventBus();
