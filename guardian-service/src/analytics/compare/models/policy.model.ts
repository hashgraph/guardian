import { Policy } from "@entity/policy";
import { BlockModel } from "./block.model";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IArtifacts } from "../interfaces/artifacts.interface";
import { SchemaModel } from "./schema.model";
import { IKeyMap } from "../interfaces/key-map.interface";

export class PolicyModel {
    public readonly tree: BlockModel;
    public readonly id: string;
    public readonly description: string;
    public readonly name: string;
    public readonly instanceTopicId: string;
    public readonly version: string;

    private readonly options: ICompareOptions;

    constructor(
        policy: Policy,
        artifacts: IArtifacts[],
        schemas: SchemaModel[],
        options: ICompareOptions
    ) {
        this.options = options;

        this.id = policy.id;
        this.name = policy.name;
        this.description = policy.description;
        this.instanceTopicId = policy.instanceTopicId;
        this.version = policy.version;

        if (!policy.config) {
            throw new Error('Empty policy model');
        }

        this.tree = this.createBlock(policy.config, 0, this.options);

        const list = this.getAllBlocks(this.tree, []);
        const blockMap: IKeyMap<BlockModel> = {};
        for (const block of list) {
            blockMap[block.tag] = block;
        }

        const schemaMap: IKeyMap<SchemaModel> = {};
        for (const schema of schemas) {
            schemaMap[schema.iri] = schema;
        }

        this.updateArtifacts(list, artifacts, options);
        this.updateEvents(list, blockMap, options);
        this.updateSchemas(list, schemaMap, options);
    }


    private getAllBlocks(root: BlockModel, list: BlockModel[]): BlockModel[] {
        list.push(root)
        for (const child of root.children) {
            this.getAllBlocks(child, list);
        }
        return list;
    }

    private createBlock(
        json: any,
        index: number,
        options: ICompareOptions
    ): BlockModel {
        const block = new BlockModel(json, index + 1);
        if (Array.isArray(json.children)) {
            for (let i = 0; i < json.children.length; i++) {
                const child = json.children[i];
                block.children.push(this.createBlock(child, i, options));
            }
        }
        block.update(options);
        return block;
    }

    private updateArtifacts(
        list: BlockModel[],
        artifacts: IArtifacts[],
        options: ICompareOptions
    ): void {
        for (const block of list) {
            block.updateArtifacts(artifacts, options);
        }
    }

    private updateEvents(
        list: BlockModel[],
        map: IKeyMap<BlockModel>,
        options: ICompareOptions
    ): void {
        for (const block of list) {
            block.updateEvents(map, options);
        }
    }

    private updateSchemas(
        list: BlockModel[],
        schemaMap: IKeyMap<SchemaModel>,
        options: ICompareOptions
    ): void {
        for (const block of list) {
            block.updateSchemas(schemaMap, options);
        }
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
