import { PolicyTool } from '@guardian/common';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { BlockModel } from './block.model';
import { VariableModel } from './variable.model';
import { CompareUtils } from '../utils/utils';
import { SchemaModel } from './schema.model';
import { FileModel } from './file.model';
import { IKeyMap } from '../interfaces/key-map.interface';

/**
 * Tool Model
 */
export class ToolModel {
    /**
     * Tool id
     * @public
     */
    public readonly id: string;

    /**
     * Tool name
     * @public
     */
    public readonly name: string;

    /**
     * Tool description
     * @public
     */
    public readonly description: string;

    /**
     * Tool hash
     * @public
     */
    public readonly hash: string;

    /**
     * Tool messageId
     * @public
     */
    public readonly messageId: string;

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

    /**
     * All schemas
     * @private
     */
    private _schemas: SchemaModel[];

    /**
     * All artifacts
     * @private
     */
    private _artifacts: FileModel[];

    constructor(tool: PolicyTool, options: ICompareOptions) {
        this.options = options;

        this.id = tool.id;
        this.name = tool.name;
        this.description = tool.description;
        this.hash = tool.hash;
        this.messageId = tool.messageId;

        if (!tool.config) {
            throw new Error('Empty tool model');
        }

        this.tree = CompareUtils.createToolModel(tool.config, 0);
        this._list = this.getAllBlocks(this.tree, []);

        this.inputEvents = this.createInputEvents(tool.config.inputEvents, this.options);
        this.outputEvents = this.createOutputEvents(tool.config.outputEvents, this.options);
        this.variables = this.createVariables(tool.config.variables, this.options);
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
     * Set schema models
     * @param schemas
     * @public
     */
    public setSchemas(schemas: SchemaModel[]): ToolModel {
        this._schemas = schemas;
        return this;
    }

    /**
     * Set artifact models
     * @param artifacts
     * @public
     */
    public setArtifacts(artifacts: FileModel[]): ToolModel {
        this._artifacts = artifacts;
        return this;
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
     * Update all weight
     * @public
     */
    public update(): ToolModel {
        const blockMap: IKeyMap<BlockModel> = {};
        for (const block of this._list) {
            blockMap[block.tag] = block;
        }
        const schemaMap: IKeyMap<SchemaModel> = {};
        for (const schema of this._schemas) {
            schemaMap[schema.iri] = schema;
        }

        for (const block of this._list) {
            block.updateArtifacts(this._artifacts, this.options);
            block.updateSchemas(schemaMap, this.options);
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
            hash: this.hash,
            messageId: this.messageId
        };
    }
}
