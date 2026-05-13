import {
    useCallback,
    useMemo,
} from "react";

import {PointerActivationConstraints} from "@dnd-kit/dom";
import {
    DragDropProvider,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useDraggable,
} from "@dnd-kit/react";
import type {DashboardPanel} from "@webui/common/dashboard/types";

import {
    clampGridPosForDrag,
    COLUMNS,
    GUTTER,
    snapDeltaToGrid,
} from "../hooks/grid-utils";
import {useDashboardLayoutStore} from "../stores/layout-store";
import {DashboardGridPanel} from "./dashboard-grid-panel";

import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";


const CELL_HEIGHT = 60;
const DRAGGING_OPACITY = 0.4;
const POINTER_ACTIVATION_DISTANCE = 5;
const KEYBOARD_OFFSET_PX = 60;

/**
 *
 * @param root0
 * @param root0.panel
 * @param root0.isEditing
 * @param root0.renderPanel
 */
const DraggablePanel = ({panel, isEditing, renderPanel}: {panel: DashboardPanel; isEditing: boolean; renderPanel: (p: DashboardPanel, e: boolean, r?: (el: Element | null) => void) => React.ReactNode}) => {
    const {ref, handleRef, isDragging} = useDraggable({
        id: panel.id,
        data: {gridPos: panel.gridPos},
    });

    return (
        <div
            className={"dashboard-panel"}
            ref={ref}
            style={{
                gridColumnEnd: panel.gridPos.x + panel.gridPos.w + 1,
                gridColumnStart: panel.gridPos.x + 1,
                gridRowEnd: panel.gridPos.y + panel.gridPos.h + 1,
                gridRowStart: panel.gridPos.y + 1,
                opacity: isDragging ?
                    DRAGGING_OPACITY :
                    1,
            }}
        >
            {renderPanel(panel, isEditing, handleRef)}
        </div>
    );
};

/**
 *
 * @param root0
 * @param root0.panel
 */
const PanelDragPreview = ({panel}: {panel: DashboardPanel}) => {
    return (
        <Card className={"shadow-lg opacity-80 rotate-1 pointer-events-none"}>
            <CardHeader className={"pb-2"}>
                <CardTitle className={"text-sm truncate"}>
                    {panel.title}
                </CardTitle>
            </CardHeader>
        </Card>
    );
};

/**
 *
 * @param panels
 * @param updatePanelGridPos
 */
function getCellWidth (): number {
    const gridEl = document.querySelector(".dashboard-grid");
    if (!gridEl) {
        return 0;
    }
    const gridRect = gridEl.getBoundingClientRect();
    const gutterOffset = GUTTER * (COLUMNS + 1);
    return (gridRect.width - gutterOffset) / COLUMNS;
}

/**
 *
 * @param panels
 * @param updatePanelGridPos
 */
function useDragEnd (
    panels: DashboardPanel[],
    updatePanelGridPos: (id: string, gridPos: DashboardPanel["gridPos"]) => void,
) {
    return useCallback((event: {operation: {source: {id: string | number} | null; transform: {x: number; y: number}}}) => {
        const {source} = event.operation;
        if (!source) {
            return;
        }

        const panelId = source.id as string;
        const panel = panels.find((p) => p.id === panelId);
        if (!panel) {
            return;
        }

        const {transform} = event.operation;
        if (0 === transform.x && 0 === transform.y) {
            return;
        }

        const cellWidth = getCellWidth();
        if (0 === cellWidth) {
            return;
        }

        const {dx, dy} = snapDeltaToGrid(transform.x, transform.y, cellWidth, CELL_HEIGHT);
        if (0 === dx && 0 === dy) {
            return;
        }

        const newPos = clampGridPosForDrag({
            ...panel.gridPos,
            x: panel.gridPos.x + dx,
            y: panel.gridPos.y + dy,
        });

        if (newPos.x !== panel.gridPos.x || newPos.y !== panel.gridPos.y) {
            updatePanelGridPos(panelId, newPos);
        }
    }, [panels,
        updatePanelGridPos]);
}

interface DashboardGridProps {
    panels: DashboardPanel[];
    isEditing: boolean;
    onFullScreen?: (panel: DashboardPanel) => void;
    annotations?: ({id: string; time: number; timeEnd?: number; title: string; tags?: string[]; color?: string}[] | undefined);
}

export const DashboardGrid = ({panels, isEditing, onFullScreen, annotations}: DashboardGridProps) => {
    const updatePanelGridPos = useDashboardLayoutStore((s) => s.updatePanelGridPos);
    const updatePanel = useDashboardLayoutStore((s) => s.updatePanel);

    const handleDragEnd = useDragEnd(panels, updatePanelGridPos);

    const panelRenderer = useCallback((panel: DashboardPanel, isEditingMode: boolean, dragHandleRef?: (element: Element | null) => void) => (
        <DashboardGridPanel
            annotations={annotations}
            dragHandleRef={dragHandleRef}
            isEditing={isEditingMode}
            panel={panel}
            onFullScreen={onFullScreen}
            onToggleCollapse={(id, collapsed) => {
                updatePanel(id, {options: {...panel.options, collapsed}});
            }}/>
    ), [onFullScreen,
        updatePanel,
        annotations]);

    const sensors = useMemo(() => [
        PointerSensor.configure({
            activationConstraints: [
                new PointerActivationConstraints.Distance({value: POINTER_ACTIVATION_DISTANCE}),
            ],
        }),
        KeyboardSensor.configure({
            offset: {x: KEYBOARD_OFFSET_PX, y: KEYBOARD_OFFSET_PX},
        }),
    ], []);

    if (!isEditing) {
        return (
            <div
                className={"dashboard-grid"}
                style={{
                    display: "grid",
                    gap: `${GUTTER}px`,
                    gridAutoRows: "minmax(60px, auto)",
                    gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
                    padding: `${GUTTER}px`,
                }}
            >
                {panels.map((panel) => (
                    <div
                        key={panel.id}
                        style={{
                            gridColumnEnd: panel.gridPos.x + panel.gridPos.w + 1,
                            gridColumnStart: panel.gridPos.x + 1,
                            gridRowEnd: panel.gridPos.y + panel.gridPos.h + 1,
                            gridRowStart: panel.gridPos.y + 1,
                        }}
                    >
                        {panelRenderer(panel, false)}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <DragDropProvider
            sensors={sensors}
            onDragEnd={handleDragEnd}
        >
            <div
                className={"dashboard-grid"}
                style={{
                    display: "grid",
                    gap: `${GUTTER}px`,
                    gridAutoRows: "minmax(60px, auto)",
                    gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
                    padding: `${GUTTER}px`,
                }}
            >
                {panels.map((panel) => (
                    <DraggablePanel
                        isEditing={true}
                        key={panel.id}
                        panel={panel}
                        renderPanel={panelRenderer}/>
                ))}
            </div>
            <DragOverlay>
                {(source) => {
                    const panel = panels.find((p) => p.id === source.id);
                    if (!panel) {
                        return null;
                    }

                    return <PanelDragPreview panel={panel}/>;
                }}
            </DragOverlay>
        </DragDropProvider>
    );
};
