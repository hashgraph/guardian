import { Policy } from "@entity/policy";
import { BlockModel } from "./block-model";
import { ICompareOptions } from "../interfaces/compare-options.interface";

export class PolicyModel {
    public readonly tree: BlockModel;
    public readonly list: { [tag: string]: BlockModel; };
    public readonly id: string;
    public readonly description: string;
    public readonly name: string;
    public readonly instanceTopicId: string;
    public readonly version: string;

    private readonly options: ICompareOptions;

    constructor(policy: Policy, options: ICompareOptions) {
        this.options = options;

        this.id = policy.id;
        this.name = policy.name;
        this.description = policy.description;
        this.instanceTopicId = policy.instanceTopicId;
        this.version = policy.version;

        if (policy.config) {
            this.tree = this.createBlock(policy.config, 0, this.options);
            this.list = this.getAllBlocks(this.tree);
            this.createEvents(this.tree, this.list, this.options);
        }
    }

    private createBlock(json: any, index: number, options: ICompareOptions): BlockModel {
        const result = new BlockModel(json, index + 1);
        if (Array.isArray(json.children)) {
            for (let i = 0; i < json.children.length; i++) {
                const child = json.children[i];
                result.children.push(this.createBlock(child, i, options));
            }
        }
        result.calcWeight(options);
        return result;
    }

    private createEvents(
        root: BlockModel, map: { [tag: string]: BlockModel; }, options: ICompareOptions
    ) {
        for (const child of root.children) {
            this.createEvents(child, map, options);
        }
        for (const event of root.events) {
            event.calcWeight(map[event.source], map[event.target], options);
        }
    }

    private getAllBlocks(
        root: BlockModel, map?: { [tag: string]: BlockModel; }
    ): { [tag: string]: BlockModel; } {
        if (!map) {
            map = {};
        }
        map[root.tag] = root;
        for (const child of root.children) {
            this.getAllBlocks(child, map);
        }
        return map;
    }

    public info(): any {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            instanceTopicId: this.instanceTopicId,
            version: this.version
        };
    }
}
