import { Policy, PolicyModule } from '@guardian/common';
import { BlockModel } from './block.model';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IArtifacts } from '../interfaces/artifacts.interface';
import { SchemaModel } from './schema.model';
import { IKeyMap } from '../interfaces/key-map.interface';
import { PropertyModel } from './property.model';
import { PropertyType } from '../types/property.type';
import { TokenModel } from './token.model';
import { GroupModel } from './group.model';
import { TopicModel } from './topic.model';
import { TemplateTokenModel } from './template-token.model';
import { RoleModel } from './role.model';
import { VariableModel } from './variable.model';

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
     * Input Events
     * @public
     */
    public readonly inputEvents: VariableModel[];

    /**
     * Output Events
     * @public
     */
    public readonly outputEvents: VariableModel[];

    /**
     * Variables
     * @public
     */
    public readonly variables: VariableModel[];

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

    constructor(policyModule: PolicyModule, options: ICompareOptions) {
        this.options = options;

        this.id = policyModule.id;
        this.name = policyModule.name;
        this.description = policyModule.description;

        if (!policyModule.config) {
            throw new Error('Empty policy model');
        }

        this.tree = this.createBlock(policyModule.config, 0);
        this._list = this.getAllBlocks(this.tree, []);

        this.inputEvents = this.createInputEvents(policyModule.config.inputEvents, this.options);
        this.outputEvents = this.createOutputEvents(policyModule.config.outputEvents, this.options);
        this.variables = this.createVariables(policyModule.config.variables, this.options);
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

    /**
     * Create Input Events by JSON
     * @param variables
     * @param options - comparison options
     * @private
     */
    private createInputEvents(variables: any[], options: ICompareOptions): VariableModel[] {
        const result: VariableModel[] = [];
        if (Array.isArray(variables)) {
            for (const json of variables) {
                json.type = 'InputEvents';
                const model = new VariableModel(json);
                model.update(options);
                result.push(model);
            }
        }
        return result;
    }

    /**
     * Create Output Events by JSON
     * @param variables
     * @param options - comparison options
     * @private
     */
    private createOutputEvents(variables: any[], options: ICompareOptions): VariableModel[] {
        const result: VariableModel[] = [];
        if (Array.isArray(variables)) {
            for (const json of variables) {
                json.type = 'OutputEvents';
                const model = new VariableModel(json);
                model.update(options);
                result.push(model);
            }
        }
        return result;
    }

    /**
     * Create Variables by JSON
     * @param variables
     * @param options - comparison options
     * @private
     */
    private createVariables(variables: any[], options: ICompareOptions): VariableModel[] {
        const result: VariableModel[] = [];
        if (Array.isArray(variables)) {
            for (const json of variables) {
                const model = new VariableModel(json);
                model.update(options);
                result.push(model);
            }
        }
        return result;
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
            description: this.description
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
}
