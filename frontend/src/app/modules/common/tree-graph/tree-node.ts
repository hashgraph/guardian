import { GenerateUUIDv4 } from "@guardian/interfaces";
import { SelectType } from "./tree-types";
import { Line } from './tree-line';

export interface NodeLink {
    to: string;
    variant?: string;
}

export class TreeNode<T> {
    public readonly uuid: string;

    public id: string;
    public type: 'root' | 'sub';
    public childIds: Set<string>;
    public linkIds: Set<NodeLink>;
    public children: TreeNode<T>[];
    public size: number;
    public data: T;
    public row: number;
    public column: number;
    public minColumn: number;
    public maxColumn: number;
    public minRow: number;
    public maxRow: number;
    public lines: Line[];
    public linkLine: Line | null;
    public selected: SelectType;
    public parent: TreeNode<T> | null;
    public entity: string;

    constructor(
        id: string | null | undefined,
        type: 'root' | 'sub' | null | undefined,
        data: T,
    ) {
        this.uuid = GenerateUUIDv4();

        this.id = id || this.uuid;
        this.type = type || 'root';
        this.childIds = new Set<string>();
        this.linkIds = new Set<NodeLink>();
        this.children = [];
        this.size = 1;
        this.data = data;
        this.row = 0;
        this.column = 0;
        this.minColumn = 0;
        this.maxColumn = 0;
        this.minRow = 0;
        this.maxRow = 0;
        this.lines = [];
        this.linkLine = null;
        this.selected = SelectType.NONE;
        this.parent = null;
        this.entity = 'default';
    }

    public addId(id: string): void {
        this.childIds.add(id);
    }

    public addLink(link: NodeLink): void {
        this.linkIds.add(link);
    }

    public addNode(node: TreeNode<T>): void {
        node.setParent(this);
        this.children.push(node);
    }

    public clone(): TreeNode<T> {
        const clone = new TreeNode<T>(this.id, this.type, this.data);
        clone.type = this.type;
        clone.data = this.data;
        clone.entity = this.entity;
        clone.childIds = new Set(this.childIds);
        clone.linkIds = new Set(this.linkIds);
        return clone;
    }

    public resize(): void {
        let size = 0;
        for (const child of this.children) {
            child.resize();
            size += child.size;
        }
        this.size = Math.max(1, size);
    }

    public select(type: SelectType) {
        this._select(type, true, true);
    }

    public setParent(parent: TreeNode<T>): void {
        this.parent = parent;
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

    public getRoot(): TreeNode<T> {
        if (this.parent) {
            return this.parent.getRoot();
        } else {
            return this;
        }
    }

    public update(): void {

    }
}