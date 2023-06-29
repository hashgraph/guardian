import { PolicyModule } from '@guardian/common';
import { BlockModel } from './block.model';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IArtifacts } from '../interfaces/artifacts.interface';
import { IKeyMap } from '../interfaces/key-map.interface';
import { PropertyModel } from './property.model';
import { PropertyType } from '../types/property.type';

/**
 * Policy Model
 */
export class ModuleModel {
    /**
     * Policy id
     * @public
     */
    public readonly id: string;

    /**
     * Policy description
     * @public
     */
    public readonly description: string;

    /**
     * Policy name
     * @public
     */
    public readonly name: string;

    /**
     * Blocks
     * @public
     */
    public readonly tree: BlockModel;

    /**
     * Compare Options
     * @private
     */
    private readonly options: ICompareOptions;

    /**
     * All Blocks
     * @private
     */
    private readonly _list: BlockModel[];

    /**
     * All artifacts
     * @private
     */
    private _artifacts: IArtifacts[];

    constructor(module: PolicyModule, options: ICompareOptions) {
        this.options = options;

        this.id = module.id;
        this.name = module.name;
        this.description = module.description;

        if (!module.config) {
            throw new Error('Empty module model');
        }

        this.tree = this.createBlock(module.config, 0);
        this._list = this.getAllBlocks(this.tree, []);
    }

    /**
     * Set artifact models
     * @param artifacts
     * @public
     */
    public setArtifacts(artifacts: IArtifacts[]): ModuleModel {
        this._artifacts = artifacts;
        return this;
    }

    /**
     * Update all weight
     * @public
     */
    public update(): ModuleModel {
        const blockMap: IKeyMap<BlockModel> = {};
        for (const block of this._list) {
            blockMap[block.tag] = block;
        }
        // const schemaMap: IKeyMap<SchemaModel> = {};
        // for (const schema of this._schemas) {
        //     schemaMap[schema.iri] = schema;
        // }
        // const tokenMap: IKeyMap<TokenModel> = {};
        // for (const token of this._tokens) {
        //     tokenMap[token.tokenId] = token;
        // }

        for (const block of this._list) {
            block.updateArtifacts(this._artifacts, this.options);
            // block.updateSchemas(schemaMap, this.options);
            // block.updateTokens(tokenMap, this.options);;
        }

        this.updateAllBlocks(this.tree, this.options);

        for (const block of this._list) {
            block.updateEvents(blockMap, this.options);
        }

        return this;
    }

    /**
     * Convert class to object
     * @public
     */
    public info(): any {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
        };
    }

    /**
     * Get all properties (all blocks)
     * @param type - filter by property type
     * @public
     */
    public getAllProp<T>(type: PropertyType): PropertyModel<T>[] {
        let prop = [];
        for (const block of this._list) {
            prop = [...prop, ...block.getPropList(type)];
        }
        return prop;
    }

    /**
     * Convert tree to array
     * @param root
     * @param list - result
     * @private
     */
    private getAllBlocks(root: BlockModel, list: BlockModel[]): BlockModel[] {
        list.push(root)
        for (const child of root.children) {
            this.getAllBlocks(child, list);
        }
        return list;
    }

    /**
     * Create Block by JSON
     * @param json
     * @param index
     * @private
     */
    private createBlock(json: any, index: number): BlockModel {
        const block = new BlockModel(json, index + 1);
        if (Array.isArray(json.children)) {
            for (let i = 0; i < json.children.length; i++) {
                const child = json.children[i];
                block.addChildren(this.createBlock(child, i));
            }
        }
        return block;
    }

    /**
     * Update all weight (all blocks)
     * @param root
     * @param options - comparison options
     * @public
     */
    private updateAllBlocks(root: BlockModel, options: ICompareOptions): void {
        for (const child of root.children) {
            this.updateAllBlocks(child, options);
        }
        root.update(options);
    }
}
