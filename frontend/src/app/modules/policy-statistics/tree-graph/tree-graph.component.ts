import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { GenerateUUIDv4 } from '@guardian/interfaces';

export class TreeNode {
    public readonly uuid: string;

    public id: string;
    public type: 'root' | 'sub';
    public childIds: string[];
    public children: TreeNode[];
    public size: number;
    public data: any;
    public row: number;
    public column: number;
    public minColumn: number;
    public maxColumn: number;
    public minRow: number;
    public maxRow: number;

    constructor(id?: string) {
        this.uuid = GenerateUUIDv4();

        this.id = id || this.uuid;
        this.type = 'root';
        this.childIds = [];
        this.children = [];
        this.size = 1;
        this.data = null;
        this.row = 0;
        this.column = 0;
        this.minColumn = 0;
        this.maxColumn = 0;
        this.minRow = 0;
        this.maxRow = 0;
    }

    public addId(id: string): void {
        this.childIds.push(id);
    }

    public addNode(node: TreeNode): void {
        this.children.push(node);
    }

    public clone(): TreeNode {
        const clone = new TreeNode(this.id);
        clone.type = this.type;
        clone.data = this.data;
        clone.childIds = this.childIds.slice();
        return clone;
    }

    public resize(): void {
        let size = 0;
        for (const child of this.children) {
            child.resize();
            size += child.size;
        }
        this.size = Math.max(1, size);
        if (this.size % 2 === 0) {
            this.size += 1;
        }
    }
}

export class Grid {
    public column: number;
    public row: number;
    public nodes: TreeNode[];
    public columnsTemplate: string;
    public rowsTemplate: string;

    constructor() {
        this.column = 0;
        this.row = 0;
        this.nodes = [];
    }

    public addNode(node: TreeNode): void {
        this.row = Math.max(this.row, node.row);
        this.column = Math.max(this.column, node.column);
        this.nodes.push(node);
    }

    public render() {
        this.columnsTemplate = 'auto';
        for (let i = 1; i < this.column; i++) {
            this.columnsTemplate += ` auto`;
        }
        this.rowsTemplate = 'auto';
        for (let i = 1; i < this.row; i++) {
            this.rowsTemplate += ` auto`;
        }
    }
}

@Component({
    selector: 'app-tree-graph',
    templateUrl: './tree-graph.component.html',
    styleUrls: ['./tree-graph.component.scss'],
})
export class TreeGraphComponent implements OnInit {
    @Output('init') init = new EventEmitter<TreeGraphComponent>();
    public roots: TreeNode[];
    public grid: Grid;

    constructor() {
    }

    ngOnInit() {
        this.init.emit(this);
    }

    ngOnDestroy(): void {

    }

    public setData(nodes: TreeNode[]) {
        this.roots = this.nonUniqueNodes(nodes)
        this.grid = this.createLayout(this.roots);
        this.grid.render();

        // const roots = this.uniqueNodes(nodes)
        // for (const node of nodes) {
        //     node.size = 1;
        //     if (!node.children) {
        //         node.children = [];
        //     }
        //     for (const id of node.childIds) {
        //         const child = nodeMap.get(id);
        //         if (child) {
        //             node.children.push(child);
        //         }
        //     }
        // }
        // const roots = nodes.filter((n) => n.type === 'root')
    }

    private uniqueNodes(nodes: TreeNode[]): TreeNode[] {
        const nodeMap = new Map<string, TreeNode>();
        for (const node of nodes) {
            nodeMap.set(node.id, node);
        }

        const roots = nodes.filter((n) => n.type === 'root');
        const subs = nodes.filter((n) => n.type !== 'root');

        return roots;
    }

    private nonUniqueNodes(nodes: TreeNode[]): TreeNode[] {
        const roots = nodes.filter((n) => n.type === 'root');
        const subs = nodes.filter((n) => n.type !== 'root');

        const nodeMap = new Map<string, TreeNode>();
        for (const node of subs) {
            nodeMap.set(node.id, node);
        }

        const getSubNode = (node: TreeNode): TreeNode => {
            for (const id of node.childIds) {
                const child = nodeMap.get(id);
                if (child) {
                    node.addNode(getSubNode(child.clone()));
                }
            }
            return node;
        }
        for (const root of roots) {
            getSubNode(root);
            root.resize();
        }
        return roots;
    }

    private createLayout(roots: TreeNode[]): Grid {
        const grid = new Grid();
        const updateCoord = (node: TreeNode, row: number, column: number): number => {
            const max = column + node.size;
            node.column = column + Math.floor(node.size / 2) + 1;
            node.minColumn = column + 1;
            node.maxColumn = max + 1;
            node.row = row;
            node.minRow = row;
            node.maxRow = row;
            grid.addNode(node)

            const m = (node.children.length / 2);
            let c = column;
            for (let index = 0; index < node.children.length; index++) {
                const child = node.children[index];
                if (Math.abs(index - m) < 0.1) {
                    c++;
                }
                c = updateCoord(child, row + 1, c);
            }
            return max;
        }

        let column = 0;
        for (const node of roots) {
            column = updateCoord(node, 1, column);
        }

        return grid;
    }
}
