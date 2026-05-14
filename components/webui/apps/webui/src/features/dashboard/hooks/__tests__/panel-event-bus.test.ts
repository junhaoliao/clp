import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    type PanelEvent,
    panelEventBus,
} from "../panel-event-bus";


describe("PanelEventBus", () => {
    afterEach(() => {
        panelEventBus.removeAll();
    });

    it("should emit events to registered handlers", () => {
        const handler = vi.fn();
        panelEventBus.on("click", handler);

        const event: PanelEvent = {type: "click", sourcePanelId: "p1", payload: {field: "status", value: "error"}};
        panelEventBus.emit(event);

        expect(handler).toHaveBeenCalledWith(event);
    });

    it("should support multiple handlers for the same event type", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        panelEventBus.on("click", handler1);
        panelEventBus.on("click", handler2);

        const event: PanelEvent = {type: "click", sourcePanelId: "p1", payload: {}};
        panelEventBus.emit(event);

        expect(handler1).toHaveBeenCalledWith(event);
        expect(handler2).toHaveBeenCalledWith(event);
    });

    it("should unsubscribe when cleanup function is called", () => {
        const handler = vi.fn();
        const unsub = panelEventBus.on("click", handler);
        unsub();

        panelEventBus.emit({type: "click", sourcePanelId: "p1", payload: {}});

        expect(handler).not.toHaveBeenCalled();
    });

    it("should not call handlers for different event types", () => {
        const handler = vi.fn();
        panelEventBus.on("click", handler);

        panelEventBus.emit({type: "hover", sourcePanelId: "p1", payload: {}});

        expect(handler).not.toHaveBeenCalled();
    });

    it("should clear all handlers on removeAll", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        panelEventBus.on("click", handler1);
        panelEventBus.on("hover", handler2);

        panelEventBus.removeAll();
        panelEventBus.emit({type: "click", sourcePanelId: "p1", payload: {}});
        panelEventBus.emit({type: "hover", sourcePanelId: "p1", payload: {}});

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
    });
});
