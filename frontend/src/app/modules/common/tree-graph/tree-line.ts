import { SelectType } from "./tree-types";
import { TreeNode } from "./tree-node";

export class Line {
    public width: number;
    public height: number;
    public items: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
    }[];
    public start: TreeNode<any>;
    public end: TreeNode<any>;
    public type: string;
    public variant: string;
    public selected: SelectType;
    private _width: number;

    constructor(width: number, variant?: string) {
        this._width = width;
        this.items = [];
        this.width = 0;
        this.height = 0;
        this.variant = variant || '';
    }

    public addStart(node: TreeNode<any>): void {
        this.start = node;
    }

    public addEnd(node: TreeNode<any>): void {
        this.end = node;
    }

    public render(): void {
        const colDiff = this.end.column - this.start.column;
        this.width = Math.abs(colDiff) * this._width;
        if (colDiff === 0) {
            this.type = 'middle';
        } else if (colDiff < 0) {
            this.type = 'left';
        } else {
            this.type = 'right';
        }
    }

    public select() {
        if (!this.start || !this.end) {
            return;
        }
        if (this.start.selected === SelectType.HIDDEN ||
            this.end.selected === SelectType.HIDDEN) {
            this.selected = SelectType.HIDDEN;
        } else if (this.start.selected === SelectType.SELECTED ||
            this.end.selected === SelectType.SELECTED) {
            this.selected = SelectType.SELECTED;
        } else if (this.start.selected === SelectType.SUB ||
            this.end.selected === SelectType.SUB) {
            this.selected = SelectType.SUB;
        } else {
            this.selected = SelectType.NONE;
        }
    }
}
