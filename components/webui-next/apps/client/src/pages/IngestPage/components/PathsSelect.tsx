import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    ChevronDown,
    ChevronRight,
    ChevronUp,
    File,
    Folder,
    X,
} from "lucide-react";

import {Button} from "../../../components/ui/button";
import {SETTINGS_LOGS_INPUT_ROOT_DIR} from "../../../config";


interface FileNode {
    name: string;
    path: string;
    isExpandable: boolean;
    expanded?: boolean;
    children?: FileNode[];
}


interface PathsSelectProps {
    onPathsChange: (paths: string[]) => void;
    paths: string[];
}


const INDENT_PER_DEPTH_PX = 16;
const BASE_INDENT_PX = 8;


/**
 * Updates a node's children in the tree immutably.
 *
 * @param nodes
 * @param targetPath
 * @param children
 */
const updateNodeInTree = (
    nodes: FileNode[],
    targetPath: string,
    children: FileNode[],
): FileNode[] => {
    return nodes.map((node) => {
        if (node.path === targetPath) {
            return {
                ...node,
                children: children,
                expanded: true,
            };
        }

        if (node.children && 0 < node.children.length) {
            return {
                ...node,
                children: updateNodeInTree(node.children, targetPath, children),
            };
        }

        return node;
    });
};


/**
 * Sets a node's expanded state in the tree immutably.
 *
 * @param nodes
 * @param targetPath
 * @param expanded
 */
const setNodeExpanded = (
    nodes: FileNode[],
    targetPath: string,
    expanded: boolean,
): FileNode[] => {
    return nodes.map((n) => {
        if (n.path === targetPath) {
            return {...n,
                expanded};
        }

        if (n.children && 0 < n.children.length) {
            return {
                ...n,
                children: setNodeExpanded(n.children, targetPath, expanded),
            };
        }

        return n;
    });
};


interface TreeLevelProps {
    nodes: FileNode[];
    paths: string[];
    depth: number;
    toggleExpand: (node: FileNode) => void;
    toggleSelection: (path: string) => void;
    rootPath: string;
    loadDirectory: (path: string) => Promise<void>;
}


/**
 *
 * @param root0
 * @param root0.nodes
 * @param root0.paths
 * @param root0.depth
 * @param root0.toggleExpand
 * @param root0.toggleSelection
 * @param root0.loadDirectory
 * @param root0.rootPath
 */
const TreeLevel = ({
    nodes,
    paths,
    depth,
    toggleExpand,
    toggleSelection,
    loadDirectory,
    rootPath,
}: TreeLevelProps) => {
    if (0 === nodes.length && 0 === depth) {
        return (
            <Button
                type={"button"}
                variant={"ghost"}
                className={
                    "flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground " +
                    "rounded w-full justify-start h-auto font-normal"
                }
                onClick={() => {
                    loadDirectory(rootPath).catch(() => {
                        // Ignore errors
                    });
                }}
            >
                <Folder className={"h-4 w-4"}/>
                {rootPath}
            </Button>
        );
    }

    return (
        <ul className={"space-y-0"}>
            {nodes.map((node) => (
                <li key={node.path}>
                    <div
                        className={"flex items-center gap-1 px-2 py-0.5 text-sm hover:bg-accent rounded cursor-pointer"}
                        style={{paddingLeft: `${(depth * INDENT_PER_DEPTH_PX) + BASE_INDENT_PX}px`}}
                    >
                        {/* Expand/collapse toggle */}
                        {node.isExpandable ?
                            (
                                <Button
                                    className={"p-0.5 h-auto w-auto min-w-0"}
                                    size={"icon"}
                                    type={"button"}
                                    variant={"ghost"}
                                    onClick={() => {
                                        toggleExpand(node);
                                    }}
                                >
                                    {node.expanded ?
                                        <ChevronDown className={"h-3 w-3"}/> :
                                        <ChevronRight className={"h-3 w-3"}/>}
                                </Button>
                            ) :
                            (
                                <span className={"w-4"}/>
                            )}

                        {/* Icon */}
                        {node.isExpandable ?
                            <Folder className={"h-4 w-4 text-primary shrink-0"}/> :
                            <File className={"h-4 w-4 text-muted-foreground shrink-0"}/>}

                        {/* Name -- click to select */}
                        <Button
                            type={"button"}
                            variant={"ghost"}
                            className={
                                "flex-1 justify-start truncate h-auto p-0 text-left " +
                                `font-normal hover:bg-transparent ${
                                    paths.includes(node.path) ?
                                        "text-primary font-medium" :
                                        ""
                                }`
                            }
                            onClick={() => {
                                toggleSelection(node.path);
                            }}
                        >
                            {node.name}
                        </Button>
                    </div>

                    {/* Children */}
                    {node.expanded && node.children && 0 < node.children.length && (
                        <TreeLevel
                            depth={depth + 1}
                            loadDirectory={loadDirectory}
                            nodes={node.children}
                            paths={paths}
                            rootPath={rootPath}
                            toggleExpand={toggleExpand}
                            toggleSelection={toggleSelection}/>
                    )}
                </li>
            ))}
        </ul>
    );
};


/**
 * Sorts and transforms directory entries into FileNode objects.
 *
 * @param entries
 */
const buildFileNodes = (entries: Array<{
    isExpandable: boolean;
    name: string;
    parentPath: string;
}>): FileNode[] => {
    return entries
        .sort((a, b) => {
            // Directories first, then files
            if (a.isExpandable !== b.isExpandable) {
                return a.isExpandable ?
                    -1 :
                    1;
            }

            return a.name.localeCompare(b.name);
        })
        .map((entry) => ({
            name: entry.name,
            path: `${entry.parentPath}/${entry.name}`.replace(/\/+/g, "/"),
            isExpandable: entry.isExpandable,
            expanded: false,
            children: [],
        }));
};


/**
 * Tree-select dropdown that uses /api/os/ls to browse the filesystem.
 * Allows selecting multiple files/directories for compression.
 * Starts from the root "/" directory with expandable subdirectories.
 *
 * @param root0
 * @param root0.onPathsChange
 * @param root0.paths
 */
const PathsSelect = ({onPathsChange, paths}: PathsSelectProps) => {
    const [tree, setTree] = useState<FileNode[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const loadedDirsRef = useRef<Set<string>>(new Set());

    const rootPath = SETTINGS_LOGS_INPUT_ROOT_DIR ?? "/";

    const loadDirectory = useCallback(async (dirPath: string) => {
        if (loadedDirsRef.current.has(dirPath)) {
            return;
        }
        try {
            const res = await fetch(`/api/os/ls?path=${encodeURIComponent(dirPath)}`);
            if (!res.ok) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const body = await res.json().catch(() => ({}));
                const msg = (body as {error?: string}).error ?? `HTTP ${res.status}`;
                if (dirPath === rootPath) {
                    setLoadError(`Cannot load "${dirPath}": ${msg}`);
                }

                return;
            }

            setLoadError(null);

            const entries = await res.json() as Array<{
                isExpandable: boolean;
                name: string;
                parentPath: string;
            }>;

            const nodes = buildFileNodes(entries);

            loadedDirsRef.current.add(dirPath);

            if (dirPath === rootPath) {
                setTree(nodes);
            } else {
                setTree((prev) => updateNodeInTree(prev, dirPath, nodes));
            }
        } catch {
            // Ignore errors
        }
    }, []);

    // Load root on mount or when dropdown opens
    useEffect(() => {
        if (isOpen) {
            loadDirectory(rootPath).catch(() => {
                // Ignore errors
            });
        }
    }, [isOpen,
        loadDirectory]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const toggleExpand = (node: FileNode) => {
        if (!node.isExpandable) {
            return;
        }

        if (node.expanded) {
            // Collapse
            setTree((prev) => setNodeExpanded(prev, node.path, false));
        } else if (node.children && 0 < node.children.length) {
            // Already loaded, just expand
            setTree((prev) => setNodeExpanded(prev, node.path, true));
        } else {
            // Not loaded yet, fetch and expand
            loadDirectory(node.path).catch(() => {
                // Ignore errors
            });
        }
    };

    const toggleSelection = (nodePath: string) => {
        if (paths.includes(nodePath)) {
            onPathsChange(paths.filter((p) => p !== nodePath));
        } else {
            onPathsChange([...paths,
                nodePath]);

            // Auto-close dropdown after selecting a file
            setIsOpen(false);
        }
    };

    const removePath = (nodePath: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onPathsChange(paths.filter((p) => p !== nodePath));
    };

    return (
        <div
            className={"relative"}
            ref={containerRef}
        >
            {/* Trigger / Select box */}
            <Button
                type={"button"}
                variant={"outline"}
                className={
                    "flex min-h-[38px] w-full items-center gap-1 rounded-md border px-3 py-2 " +
                    `text-left text-sm h-auto font-normal ${
                        isOpen ?
                            "border-primary ring-1 ring-primary/20" :
                            "border-input"
                    }${0 === paths.length ?
                        " text-muted-foreground" :
                        ""}`
                }
                onClick={() => {
                    setIsOpen((prev) => !prev);
                }}
            >
                <div className={"flex flex-1 flex-wrap gap-1"}>
                    {0 === paths.length ?
                        (
                            <span>Select files or directories...</span>
                        ) :
                        (
                            paths.map((p) => (
                                <span
                                    className={"inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs font-mono"}
                                    key={p}
                                >
                                    <span className={"max-w-[200px] truncate"}>
                                        {p}
                                    </span>
                                    <X
                                        className={"h-3 w-3 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"}
                                        onClick={(e) => {
                                            removePath(p, e);
                                        }}/>
                                </span>
                            ))
                        )}
                </div>
                {isOpen ?
                    <ChevronUp className={"h-4 w-4 shrink-0 text-muted-foreground"}/> :
                    <ChevronDown className={"h-4 w-4 shrink-0 text-muted-foreground"}/>}
            </Button>

            {/* Dropdown panel */}
            {isOpen && (
                <div className={"absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"}>
                    {/* Error */}
                    {loadError && (
                        <div className={"rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive m-1"}>
                            {loadError}
                        </div>
                    )}
                    {/* Tree browser */}
                    <div className={"max-h-[300px] overflow-auto p-1"}>
                        <TreeLevel
                            depth={0}
                            loadDirectory={loadDirectory}
                            nodes={tree}
                            paths={paths}
                            rootPath={rootPath}
                            toggleExpand={toggleExpand}
                            toggleSelection={toggleSelection}/>
                    </div>
                </div>
            )}
        </div>
    );
};


export {PathsSelect};
