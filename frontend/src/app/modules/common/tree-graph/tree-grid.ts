import { Line } from "./tree-line";
import { TreeNode } from "./tree-node";

export class Grid {
    public column: number;
    public row: number;
    public nodes: TreeNode<any>[];
    public columnsTemplate: string;
    public rowsTemplate: string;
    public width: number;
    public x: number = 0;
    public y: number = 0;
    public moving: boolean = false;

    private _clientX: number = 0;
    private _clientY: number = 0;

    constructor(width: number) {
        this.column = 0;
        this.row = 0;
        this.nodes = [];
        this.width = width;
    }

    public addNode(node: TreeNode<any>): void {
        this.row = Math.max(this.row, node.row);
        this.column = Math.max(this.column, node.column);
        this.nodes.push(node);
    }

    public static createLayout(width: number, roots: TreeNode<any>[]): Grid {
        const grid = new Grid(width);
        const updateCoord = (node: TreeNode<any>, row: number, column: number): number => {
            const max = column + node.size;
            node.column = column + (node.size / 2);
            node.minColumn = column + 1;
            node.maxColumn = max + 1;
            node.row = row;
            node.minRow = row;
            node.maxRow = row;
            grid.addNode(node)

            let c = column;
            for (const child of node.children) {
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

    public render(): void {
        this.columnsTemplate = `${this.width}px`;
        for (let i = 1; i < this.column; i++) {
            this.columnsTemplate += ` ${this.width}px`;
        }
        this.rowsTemplate = `auto`;
        for (let i = 1; i < this.row; i++) {
            this.rowsTemplate += ` auto `;
        }

        // Build node lookup by id
        const nodeById = new Map<string, TreeNode<any>>();
        for (const node of this.nodes) {
            nodeById.set(node.id, node);
        }

        for (const node of this.nodes) {
            node.lines = [];
            node.linkLine = null;

            // Create child lines
            for (const child of node.children) {
                const line = new Line(this.width);
                line.addStart(node);
                line.addEnd(child);
                line.render();
                node.lines.push(line);
            }

            // Create link line to rightmost target
            if (node.linkIds.size > 0) {
                let rightmostTarget: TreeNode<any> | null = null;
                let variant: string | undefined;

                for (const linkId of node.linkIds) {
                    const targetNode = nodeById.get(linkId.to);
                    if (targetNode && (!rightmostTarget || targetNode.column > rightmostTarget.column)) {
                        rightmostTarget = targetNode;
                        variant = linkId.variant;
                    }
                }

                if (rightmostTarget) {
                    const linkLine = new Line(this.width, variant);
                    linkLine.addStart(node);
                    linkLine.addEnd(rightmostTarget);
                    linkLine.render();
                    node.linkLine = linkLine;
                }
            }
        }
    }

    public onMove(moving: boolean, $event: any) {
        this.moving = moving;
        this._clientX = $event.clientX;
        this._clientY = $event.clientY;
    }

    public onMoving($event: any) {
        if (this.moving) {
            this.x = this.x - (this._clientX - $event.clientX);
            this.y = this.y - (this._clientY - $event.clientY);
            this._clientX = $event.clientX;
            this._clientY = $event.clientY;
            return true;
        }
        return false;
    }

    public move(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }
}
