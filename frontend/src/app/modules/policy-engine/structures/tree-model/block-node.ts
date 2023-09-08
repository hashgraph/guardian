import { PolicyItem } from "../policy-models/interfaces/types";

export class FlatBlockNode {
    public id!: string;
    public isModule!: boolean;
    public isTool!: boolean;
    public about!: any;
    public root!: boolean;
    public icon!: string;
    public type!: string;
    public expandable!: boolean;
    public collapsed!: boolean;
    public level!: number;
    public offset!: string;
    public node!: PolicyItem;
    public prev!: PolicyItem;
    public next!: PolicyItem;
    public parent!: PolicyItem;
    public parentNode!: FlatBlockNode;
    public data!: any;
    public error!: boolean;
    public deprecated!: boolean;
    public style!: string;

    constructor(node: PolicyItem) {
        this.node = node;
        this.id = node.id;
        this.isModule = node.isModule;
        this.isTool = node.isTool;
    }
}
