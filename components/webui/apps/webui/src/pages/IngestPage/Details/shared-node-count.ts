import type {SchemaTreeNode} from "@/features/clpp/types";


/**
 * Counts leaf nodes whose key appears at more than one distinct path
 * in the schema tree. These "shared nodes" indicate fields where
 * different logtypes contribute values to the same position,
 * which can cause ambiguous query results.
 *
 * @param node - Root of the schema tree
 * @return Number of shared leaf nodes
 */
const countSharedNodes = (node: SchemaTreeNode): number => {
    const keyPaths = new Map<string, Set<string>>();

    const traverse = (
        current: SchemaTreeNode,
        path: string = "",
    ) => {
        // Use node ID to disambiguate empty-key containers (CLPP
        // variable-position nodes) so children under different
        // containers get distinct paths.
        const segment = current.key || `[${current.id}]`;
        const currentPath = path ? `${path}.${segment}` : segment;

        if ("object" !== current.type && current.key) {
            if (!keyPaths.has(current.key)) {
                keyPaths.set(current.key, new Set());
            }
            keyPaths.get(current.key)!.add(currentPath);
        }

        for (const child of current.children) {
            traverse(child, currentPath);
        }
    };

    traverse(node);

    let shared = 0;
    for (const paths of keyPaths.values()) {
        if (1 < paths.size) {
            shared++;
        }
    }

    return shared;
};


export {countSharedNodes};
