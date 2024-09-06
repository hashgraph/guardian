import { GenerateUUIDv4 } from "@guardian/interfaces";
import { SelectType } from "./tree-types";
import { Line } from './tree-line';


export class TreeNode {
    public readonly uuid: string;

    public id: string;
    public type: 'root' | 'sub';
    public childIds: Set<string>;
    public children: TreeNode[];
    public size: number;
    public data: any;
    public row: number;
    public column: number;
    public minColumn: number;
    public maxColumn: number;
    public minRow: number;
    public maxRow: number;
    public lines: Line[];
    public selected: SelectType;
    public parent: TreeNode | null;

    constructor(id?: string) {
        this.uuid = GenerateUUIDv4();

        this.id = id || this.uuid;
        this.type = 'root';
        this.childIds = new Set<string>();
        this.children = [];
        this.size = 1;
        this.data = null;
        this.row = 0;
        this.column = 0;
        this.minColumn = 0;
        this.maxColumn = 0;
        this.minRow = 0;
        this.maxRow = 0;
        this.lines = [];
        this.selected = SelectType.NONE;
        this.parent = null;
    }

    public addId(id: string): void {
        this.childIds.add(id);
    }

    public addNode(node: TreeNode): void {
        node.parent = this;
        this.children.push(node);
    }

    public clone(): TreeNode {
        const clone = new TreeNode(this.id);
        clone.type = this.type;
        clone.data = this.data;
        clone.childIds = new Set(this.childIds);
        return clone;
    }

    public resize(): void {
        let size = 0;
        for (const child of this.children) {
            child.resize();
            size += child.size;
        }
        this.size = Math.max(1, size);
        // if (this.size % 2 === 0) {
        //     this.size += 1;
        // }
    }

    public select(type: SelectType) {
        this._select(type, true, true);
    }

    private _select(
        type: SelectType,
        parent: boolean,
        children: boolean
    ) {
        this.selected = type;
        if (parent && this.parent) {
            this.parent._select(SelectType.SUB, true, false);
        }
        if (children && this.children) {
            for (const child of this.children) {
                child._select(SelectType.SUB, false, true);
            }
        }
    }

    public getRoot(): TreeNode {
        if (this.parent) {
            return this.parent.getRoot();
        } else {
            return this;
        }
    }
}
