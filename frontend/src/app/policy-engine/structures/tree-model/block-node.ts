import { PolicyBlockModel } from "../policy-models/block.model";

export class FlatBlockNode {
    public id!: string;
    public isModule!: boolean;
    public about!: any;
    public root!: boolean;
    public icon!: string;
    public type!: string;
    public expandable!: boolean;
    public collapsed!: boolean;
    public level!: number;
    public offset!: string;
    public node!: PolicyBlockModel;
    public prev!: PolicyBlockModel;
    public next!: PolicyBlockModel;
    public parent!: PolicyBlockModel;
    public parentNode!: FlatBlockNode;
    public data!: any;
    public error!: boolean;

    constructor(node: PolicyBlockModel) {
        this.node = node;
        this.id = node.id;
        this.isModule = node.isModule;
    }
}
