import { TreeNode } from "./tree-node";

export class TreeSource<T extends TreeNode<any>> {
    public readonly roots: T[];
    public readonly nodes: T[];

    constructor(nodes: T[]) {
        const roots = nodes.filter((n) => n.type === 'root');
        const subs = nodes.filter((n) => n.type !== 'root');

        const nodeMap = new Map<string, T>();
        for (const node of subs) {
            nodeMap.set(node.id, node);
        }

        const allNodes: T[] = [];
        const getSubNode = (node: T): T => {
            allNodes.push(node);
            for (const id of node.childIds) {
                const child = nodeMap.get(id);
                if (child) {
                    node.addNode(getSubNode(child.clone() as T));
                } else {
                    console.log('', id)
                }
            }
            return node;
        }
        for (const root of roots) {
            getSubNode(root);
        }
        for (const root of roots) {
            root.resize();
        }
        for (const node of allNodes) {
            node.update();
        }
        this.roots = roots;
        this.nodes = allNodes;
    }
}