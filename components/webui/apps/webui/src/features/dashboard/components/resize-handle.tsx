import {
    useCallback,
    useState,
} from "react";

import type {
    DashboardPanel,
    GridPos,
} from "@webui/common/dashboard/types";

import {
    clampGridPosForResize,
    COLUMNS,
    GUTTER,
    snapDeltaToGrid,
} from "../hooks/grid-utils";


const CELL_HEIGHT = 60;

export const ResizeHandle = ({panel, onResize}: {panel: DashboardPanel; onResize: (id: string, gridPos: GridPos) => void}) => {
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);

        const startX = e.clientX;
        const startY = e.clientY;
        const startGridPos = {...panel.gridPos};

        const gridEl = document.querySelector(".dashboard-grid");
        if (!gridEl) {
            return;
        }
        const gridRect = gridEl.getBoundingClientRect();
        const gutterOffset = GUTTER * (COLUMNS + 1);
        const cellWidth = (gridRect.width - gutterOffset) / COLUMNS;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const px = moveEvent.clientX - startX;
            const py = moveEvent.clientY - startY;

            const {dx: dw, dy: dh} = snapDeltaToGrid(px, py, cellWidth, CELL_HEIGHT);
            const newPos = clampGridPosForResize({
                ...startGridPos,
                w: startGridPos.w + dw,
                h: startGridPos.h + dh,
            });

            const panelEl = (e.target as HTMLElement).closest(".dashboard-panel");
            if (panelEl) {
                const scaleX = newPos.w / startGridPos.w;
                const scaleY = newPos.h / startGridPos.h;
                (panelEl as HTMLElement).style.transform = `scale(${scaleX}, ${scaleY})`;
                (panelEl as HTMLElement).style.transformOrigin = "top left";
            }
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            setIsResizing(false);

            const px = upEvent.clientX - startX;
            const py = upEvent.clientY - startY;

            const {dx: dw, dy: dh} = snapDeltaToGrid(px, py, cellWidth, CELL_HEIGHT);
            const newPos = clampGridPosForResize({
                ...startGridPos,
                w: startGridPos.w + dw,
                h: startGridPos.h + dh,
            });

            const panelEl = (e.target as HTMLElement).closest(".dashboard-panel");
            if (panelEl) {
                (panelEl as HTMLElement).style.transform = "";
            }

            if (newPos.w !== startGridPos.w || newPos.h !== startGridPos.h) {
                onResize(panel.id, newPos);
            }
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [panel,
        onResize]);

    return (
        <div
            className={"absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"}
            onMouseDown={handleMouseDown}
        >
            <svg
                height={"16"}
                viewBox={"0 0 16 16"}
                width={"16"}
                className={`text-muted-foreground ${isResizing ?
                    "text-primary" :
                    "hover:text-foreground"}`}
            >
                <path
                    d={"M14 14H14.5V13.5V14ZM14 10.5H14.5V9.5H14V10.5ZM14 7H14.5V6H14V7ZM14 3.5H14.5V2.5H14V3.5ZM10.5 14H11.5V13.5H10.5V14ZM7 14H8V13.5H7V14ZM3.5 14H4.5V13.5H3.5V14ZM14 14V14.5H13.5V14H14ZM10.5 10.5H11.5V9.5H10.5V10.5ZM7 10.5H8V9.5H7V10.5ZM10.5 7H11.5V6H10.5V7Z"}
                    fill={"currentColor"}/>
            </svg>
        </div>
    );
};
