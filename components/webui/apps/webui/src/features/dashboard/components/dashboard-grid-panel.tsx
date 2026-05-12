import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import type {DashboardPanel} from "@webui/common/dashboard/types";
import {
    ChevronDown,
    ChevronRight,
    GripVertical,
    Maximize2,
} from "lucide-react";

import {useLazyPanel} from "../hooks/use-lazy-panel";
import {useDashboardLayoutStore} from "../stores/layout-store";
import {PanelContent} from "./panel-content";
import {ResizeHandle} from "./resize-handle";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";


interface DashboardGridPanelProps {
    panel: DashboardPanel;
    isEditing: boolean;
    dragHandleRef?: ((element: Element | null) => void) | undefined;
    onFullScreen?: ((panel: DashboardPanel) => void) | undefined;
    onToggleCollapse?: ((panelId: string, collapsed: boolean) => void) | undefined;
    annotations?: ({id: string; time: number; timeEnd?: number; title: string; tags?: string[]; color?: string}[] | undefined);
}

/**
 *
 * @param root0
 * @param root0.panel
 * @param root0.isEditing
 * @param root0.dragHandleRef
 * @param root0.onToggleCollapse
 * @param root0.isCollapsed
 * @param root0.contentRef
 * @param root0.isVisible
 * @param root0.annotations
 * @param root0.size
 * @param root0.size.width
 * @param root0.size.height
 */
const RowPanel = ({panel, isEditing, dragHandleRef, onToggleCollapse, isCollapsed, contentRef, isVisible, annotations, size}: {
    panel: DashboardPanel;
    isEditing: boolean;
    dragHandleRef?: ((element: Element | null) => void) | undefined;
    onToggleCollapse?: ((panelId: string, collapsed: boolean) => void) | undefined;
    isCollapsed: boolean;
    contentRef: (node: HTMLDivElement | null) => void;
    isVisible: boolean;
    annotations?: ({id: string; time: number; timeEnd?: number; title: string; tags?: string[]; color?: string}[] | undefined);
    size: {width: number; height: number};
}) => (
    <Card className={"h-full flex flex-col"}>
        <CardHeader
            ref={dragHandleRef ?? null}
            className={`pb-2 shrink-0 ${isEditing ?
                "cursor-grab active:cursor-grabbing" :
                ""}`}
        >
            <div className={"flex items-center gap-1"}>
                {isEditing && <GripVertical className={"size-4 text-muted-foreground shrink-0"}/>}
                <button
                    className={"inline-flex items-center gap-1 text-sm font-medium hover:text-foreground"}
                    type={"button"}
                    onClick={() => onToggleCollapse?.(panel.id, !isCollapsed)}
                >
                    {isCollapsed ?
                        <ChevronRight className={"size-4"}/> :
                        <ChevronDown className={"size-4"}/>}
                    {panel.title}
                </button>
            </div>
        </CardHeader>
        {!isCollapsed && (
            <CardContent
                className={"flex-1 min-h-0"}
                ref={contentRef}
            >
                <PanelContent
                    annotations={annotations}
                    height={size.height}
                    isVisible={isVisible}
                    panel={panel}
                    width={size.width}/>
            </CardContent>
        )}
    </Card>
);

/**
 *
 * @param root0
 * @param root0.panel
 * @param root0.isEditing
 * @param root0.dragHandleRef
 * @param root0.onFullScreen
 * @param root0.isSelected
 * @param root0.contentRef
 * @param root0.isVisible
 * @param root0.annotations
 * @param root0.size
 * @param root0.size.width
 * @param root0.size.height
 */
const StandardPanel = ({panel, isEditing, dragHandleRef, onFullScreen, isSelected, contentRef, isVisible, annotations, size}: {
    panel: DashboardPanel;
    isEditing: boolean;
    dragHandleRef?: ((element: Element | null) => void) | undefined;
    onFullScreen?: ((panel: DashboardPanel) => void) | undefined;
    isSelected: boolean;
    contentRef: (node: HTMLDivElement | null) => void;
    isVisible: boolean;
    annotations?: ({id: string; time: number; timeEnd?: number; title: string; tags?: string[]; color?: string}[] | undefined);
    size: {width: number; height: number};
}) => {
    const updatePanelGridPos = useDashboardLayoutStore((s) => s.updatePanelGridPos);
    const setSelectedPanelId = useDashboardLayoutStore((s) => s.setSelectedPanelId);

    return (
        <Card
            className={`h-full flex flex-col ${isSelected && isEditing ?
                "ring-2 ring-primary" :
                ""}`}
        >
            <CardHeader
                ref={dragHandleRef ?? null}
                className={`pb-2 shrink-0 ${isEditing ?
                    "cursor-grab active:cursor-grabbing" :
                    ""}`}
            >
                <div className={"flex items-center justify-between gap-1"}>
                    <div className={"flex items-center gap-1 min-w-0"}>
                        {isEditing && (
                            <GripVertical className={"size-4 text-muted-foreground shrink-0"}/>
                        )}
                        <CardTitle className={"text-sm truncate"}>
                            {panel.title}
                        </CardTitle>
                    </div>
                    {!isEditing && onFullScreen && (
                        <button
                            className={"inline-flex items-center justify-center size-5 rounded hover:bg-accent shrink-0"}
                            type={"button"}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFullScreen(panel);
                            }}
                        >
                            <Maximize2 className={"size-3 text-muted-foreground"}/>
                        </button>
                    )}
                </div>
            </CardHeader>
            <CardContent
                className={"flex-1 min-h-0 relative"}
                ref={contentRef}
                onClick={() => {
                    setSelectedPanelId(panel.id);
                }}
            >
                <PanelContent
                    annotations={annotations}
                    height={size.height}
                    isVisible={isVisible}
                    panel={panel}
                    width={size.width}/>
                {isEditing && (
                    <ResizeHandle
                        panel={panel}
                        onResize={updatePanelGridPos}/>
                )}
            </CardContent>
        </Card>
    );
};

export const DashboardGridPanel = ({panel, isEditing, dragHandleRef, onFullScreen, onToggleCollapse, annotations}: DashboardGridPanelProps) => {
    const selectedPanelId = useDashboardLayoutStore((s) => s.selectedPanelId);
    const contentRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({width: 300, height: 200});
    const {ref: lazyRef, isVisible} = useLazyPanel();

    useEffect(() => {
        const el = contentRef.current;
        if (!el) {
            return () => {
            };
        }
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        observer.observe(el);

        return () => {
            observer.disconnect();
        };
    }, []);

    const setContentAndLazyRef = useCallback((node: HTMLDivElement | null) => {
        (contentRef).current = node;
        lazyRef(node);
    }, [lazyRef]);

    const isRow = "row" === panel.type;
    const isCollapsed = Boolean(panel.options["collapsed"]);
    const isSelected = selectedPanelId === panel.id;

    if (isRow) {
        return (
            <RowPanel
                annotations={annotations}
                contentRef={setContentAndLazyRef}
                dragHandleRef={dragHandleRef}
                isCollapsed={isCollapsed}
                isEditing={isEditing}
                isVisible={isVisible}
                panel={panel}
                size={size}
                onToggleCollapse={onToggleCollapse}/>
        );
    }

    return (
        <StandardPanel
            annotations={annotations}
            contentRef={setContentAndLazyRef}
            dragHandleRef={dragHandleRef}
            isEditing={isEditing}
            isSelected={isSelected}
            isVisible={isVisible}
            panel={panel}
            size={size}
            onFullScreen={onFullScreen}/>
    );
};
