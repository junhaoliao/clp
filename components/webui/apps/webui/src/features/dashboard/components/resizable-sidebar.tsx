import {
    useCallback,
    useRef,
    useState,
} from "react";

const MIN_WIDTH = 240;
const MAX_WIDTH = 600;

interface ResizableSidebarProps {
    children: React.ReactNode;
    defaultWidth?: number;
    side: "left" | "right";
}

export function ResizableSidebar({children, defaultWidth = 280, side}: ResizableSidebarProps) {
    const [width, setWidth] = useState(defaultWidth);
    const isResizing = useRef(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.current = true;

        const startX = e.clientX;
        const startWidth = width;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!isResizing.current) {
                return;
            }
            const delta = "right" === side
                ? startX - moveEvent.clientX
                : moveEvent.clientX - startX;
            const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
            setWidth(next);
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [width,
        side]);

    const isRight = "right" === side;

    return (
        <div
            className="flex shrink-0 border-l bg-background overflow-auto"
            style={{width}}
        >
            {isRight && (
                <div
                    className="w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 shrink-0 transition-colors"
                    onMouseDown={handleMouseDown}
                />
            )}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
            {!isRight && (
                <div
                    className="w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 shrink-0 transition-colors"
                    onMouseDown={handleMouseDown}
                />
            )}
        </div>
    );
}
