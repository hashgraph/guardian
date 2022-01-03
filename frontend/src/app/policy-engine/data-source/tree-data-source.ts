import { NestedTreeControl } from "@angular/cdk/tree";
import { MatTreeNestedDataSource, MatTree } from "@angular/material/tree";

export interface BlockNode {
    tag: string;
    blockType: string;
    children: BlockNode[];
    [x: string]: any
}

/**
 * DataSource for Tree
 */
export class TreeDataSource extends MatTreeNestedDataSource<BlockNode> {
    constructor(
        private treeControl: NestedTreeControl<BlockNode>,
    ) {
        super();
    }

    private _root(): BlockNode {
        return {
            tag: "Root",
            blockType: "Root",
            children: this.data
        };
    }

    /** Add node as child of parent */
    public add(node: BlockNode, parent: BlockNode) {
        const newTreeData = this._root();
        this._add(node, parent, newTreeData);
        this.data = newTreeData.children;
    }

    /** Remove node from tree */
    public remove(node: BlockNode) {
        const newTreeData = this._root();
        this._remove(node, newTreeData);
        this.data = newTreeData.children;
    }

    protected _add(newNode: BlockNode, parent: BlockNode, tree: BlockNode): boolean {
        if (tree === parent) {
            console.log(
                `replacing children array of '${parent.tag}', adding ${newNode.tag}`
            );
            tree.children = [...tree.children!, newNode];
            this.treeControl.expand(tree);
            return true;
        }
        if (!tree.children) {
            console.log(`reached leaf node '${tree.tag}', backing out`);
            return false;
        }
        return this.update(tree, this._add.bind(this, newNode, parent));
    }

    _remove(node: BlockNode, tree: BlockNode): boolean {
        if (!tree.children) {
            return false;
        }
        const i = tree.children.indexOf(node);
        if (i > -1) {
            tree.children = [
                ...tree.children.slice(0, i),
                ...tree.children.slice(i + 1)
            ];
            this.treeControl.collapse(node);
            console.log(`found ${node.tag}, removing it from`, tree);
            return true;
        }
        return this.update(tree, this._remove.bind(this, node));
    }

    protected update(tree: BlockNode, predicate: (n: BlockNode) => boolean) {
        let updatedTree: any, updatedIndex: number;

        tree.children!.find((node, i) => {
            if (predicate(node)) {
                console.log(`creating new node for '${node.tag}'`);
                updatedTree = { ...node };
                updatedIndex = i;
                this.moveExpansionState(node, updatedTree);
                return true;
            }
            return false;
        });

        if (updatedTree!) {
            console.log(`replacing node '${tree.children![updatedIndex!].tag}'`);
            tree.children![updatedIndex!] = updatedTree!;
            return true;
        }
        return false;
    }

    moveExpansionState(from: BlockNode, to: BlockNode) {
        if (this.treeControl.isExpanded(from)) {
            console.log(`'${from.tag}' was expanded, setting expanded on new node`);
            this.treeControl.collapse(from);
            this.treeControl.expand(to);
        }
    }
}