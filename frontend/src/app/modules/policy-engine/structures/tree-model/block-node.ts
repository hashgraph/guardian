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
    public prevNode!: FlatBlockNode;
    public data!: any;
    public error!: boolean;
    public warning!: boolean;
    public info!: boolean;
    public deprecated!: boolean;
    public style!: string;
    public canAddModules!: boolean;
    public canAddTools!: boolean;
    public canAddBlocks!: boolean;
    public canUp!: boolean;
    public canDown!: boolean;
    public canLeft!: boolean;
    public canRight!: boolean;

    constructor(node: PolicyItem) {
        this.node = node;
        this.id = node.id;
        this.isModule = node.isModule;
        this.isTool = node.isTool;
    }
}
