import { BlockModel } from './block.model.js';
import { SchemaModel } from './schema.model.js';
import { PropertyModel } from './property.model.js';
import { PropertyType } from '../types/property.type.js';
import { TokenModel } from './token.model.js';
import { GroupModel } from './group.model.js';
import { TopicModel } from './topic.model.js';
import { TemplateTokenModel } from './template-token.model.js';
import { RoleModel } from './role.model.js';
import { FileModel } from './file.model.js';
import { TemplateToolModel } from './template-tool.model.js';
import { CompareUtils } from '../utils/utils.js';
import { CompareOptions, IKeyMap, IPolicyRawData } from '../interfaces/index.js';

/**
 * Policy Model
 */
export class PolicyModel {
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
     * Instance Topic
     * @public
     */
    public readonly instanceTopicId: string;

    /**
     * Policy version
     * @public
     */
    public readonly version: string;

    /**
     * Groups
     * @public
     */
    public readonly groups: GroupModel[];

    /**
     * Topics
     * @public
     */
    public readonly topics: TopicModel[];

    /**
     * Tokens
     * @public
     */
    public readonly tokens: TemplateTokenModel[];

    /**
     * Tools
     * @public
     */
    public readonly tools: TemplateToolModel[];

    /**
     * Roles
     * @public
     */
    public readonly roles: RoleModel[];

    /**
     * Blocks
     * @public
     */
    public readonly tree: BlockModel;

    /**
     * Compare Options
     * @private
     */
    public readonly options: CompareOptions;

    /**
     * All Blocks
     * @private
     */
    private readonly _list: BlockModel[];

    /**
     * All artifacts
     * @private
     */
    private _artifacts: FileModel[];

    /**
     * All schemas
     * @private
     */
    private _schemas: SchemaModel[];

    /**
     * All tokens
     * @private
     */
    private _tokens: TokenModel[];

    /**
     * Type
     * @private
     */
    private _type: string;

    constructor(policy: IPolicyRawData, options: CompareOptions) {
        this.options = options;

        this.id = policy.id;
        this.name = policy.name;
        this.description = policy.description;
        this.instanceTopicId = policy.instanceTopicId;
        this.version = policy.version;

        if (!policy.config) {
            throw new Error('Empty policy model');
        }

        this.tree = CompareUtils.createBlockModel(policy.config, 0);
        this._list = this.getAllBlocks(this.tree, []);

        this.roles = this.createRoles(policy.policyRoles, this.options);
        this.groups = this.createGroups(policy.policyGroups, this.options);
        this.topics = this.createTopics(policy.policyTopics, this.options);
        this.tokens = this.createTokens(policy.policyTokens, this.options);
        this.tools = this.createTools(policy.tools, this.options);

        this._type = 'id';
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
     * Update all weight (all blocks)
     * @param root
     * @param options - comparison options
     * @public
     */
    private updateAllBlocks(root: BlockModel, options: CompareOptions): void {
        for (const child of root.children) {
            this.updateAllBlocks(child, options);
        }
        root.update(options);
    }

    /**
     * Create Roles by JSON
     * @param roles
     * @param options - comparison options
     * @private
     */
    private createRoles(roles: string[], options: CompareOptions): RoleModel[] {
        const result: RoleModel[] = [];
        if (Array.isArray(roles)) {
            for (const json of roles) {
                const model = new RoleModel(json);
                model.update(options);
                result.push(model);
            }
        }
        return result;
    }

    /**
     * Create Tools by JSON
     * @param roles
     * @param options - comparison options
     * @private
     */
    private createTools(tools: any[], options: CompareOptions): any[] {
        const result: TemplateToolModel[] = [];
        if (Array.isArray(tools)) {
            for (const json of tools) {
                const model = new TemplateToolModel(json);
                model.update(options);
                result.push(model);
            }
        }
        return result;
    }

    /**
     * Create Groups by JSON
     * @param groups
     * @param options - comparison options
     * @private
     */
    private createGroups(groups: any[], options: CompareOptions): GroupModel[] {
        const result: GroupModel[] = [];
        if (Array.isArray(groups)) {
            for (const json of groups) {
                const model = new GroupModel(json);
                model.update(options);
                result.push(model);
            }
        }
        return result;
    }

    /**
     * Create Topics by JSON
     * @param topics
     * @param options - comparison options
     * @private
     */
    private createTopics(topics: any[], options: CompareOptions): TopicModel[] {
        const result: TopicModel[] = [];
        if (Array.isArray(topics)) {
            for (const json of topics) {
                const model = new TopicModel(json);
                model.update(options);
                result.push(model);
            }
        }
        return result;
    }

    /**
     * Create Tokens by JSON
     * @param tokens
     * @param options - comparison options
     * @private
     */
    private createTokens(tokens: any[], options: CompareOptions): TemplateTokenModel[] {
        const result: TemplateTokenModel[] = [];
        if (Array.isArray(tokens)) {
            for (const json of tokens) {
                const model = new TemplateTokenModel(json);
                model.update(options);
                result.push(model);
            }
        }
        return result;
    }

    /**
     * Set artifact models
     * @param artifacts
     * @public
     */
    public setArtifacts(artifacts: FileModel[]): PolicyModel {
        this._artifacts = artifacts;
        return this;
    }

    /**
     * Set schema models
     * @param schemas
     * @public
     */
    public setSchemas(schemas: SchemaModel[]): PolicyModel {
        this._schemas = schemas;
        return this;
    }

    /**
     * Set token models
     * @param tokens
     * @public
     */
    public setTokens(tokens: TokenModel[]): PolicyModel {
        this._tokens = tokens;
        return this;
    }

    /**
     * Set source type
     * @param type
     * @public
     */
    public setType(type: string): PolicyModel {
        this._type = type;
        return this;
    }

    /**
     * Update all weight
     * @public
     */
    public update(): PolicyModel {
        const blockMap: IKeyMap<BlockModel> = {};
        for (const block of this._list) {
            blockMap[block.tag] = block;
        }
        const schemaMap: IKeyMap<SchemaModel> = {};
        for (const schema of this._schemas) {
            schemaMap[schema.iri] = schema;
        }
        const tokenMap: IKeyMap<TokenModel> = {};
        for (const token of this._tokens) {
            tokenMap[token.tokenId] = token;
        }

        for (const block of this._list) {
            block.updateArtifacts(this._artifacts, this.options);
            block.updateSchemas(schemaMap, this.options);
            block.updateTokens(tokenMap, this.options);;
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
            instanceTopicId: this.instanceTopicId,
            version: this.version,
            type: this._type
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
     * Create model
     * @param policy
     * @param options
     * @public
     * @static
     */
    public static fromEntity(policy: IPolicyRawData, options: CompareOptions): PolicyModel {
        if (!policy) {
            throw new Error('Unknown policy');
        }
        return new PolicyModel(policy, options);
    }
}
