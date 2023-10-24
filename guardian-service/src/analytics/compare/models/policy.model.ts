import { Policy } from '@guardian/common';
import { BlockModel } from './block.model';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { SchemaModel } from './schema.model';
import { IKeyMap } from '../interfaces/key-map.interface';
import { PropertyModel } from './property.model';
import { PropertyType } from '../types/property.type';
import { TokenModel } from './token.model';
import { GroupModel } from './group.model';
import { TopicModel } from './topic.model';
import { TemplateTokenModel } from './template-token.model';
import { RoleModel } from './role.model';
import { FileModel } from './file.model';
import { CompareUtils } from '../utils/utils';

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
    public readonly options: ICompareOptions;

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

    constructor(policy: Policy, options: ICompareOptions) {
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
    private updateAllBlocks(root: BlockModel, options: ICompareOptions): void {
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
    private createRoles(roles: string[], options: ICompareOptions): RoleModel[] {
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
     * Create Groups by JSON
     * @param groups
     * @param options - comparison options
     * @private
     */
    private createGroups(groups: any[], options: ICompareOptions): GroupModel[] {
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
    private createTopics(topics: any[], options: ICompareOptions): TopicModel[] {
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
    private createTokens(tokens: any[], options: ICompareOptions): TemplateTokenModel[] {
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
            version: this.version
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
