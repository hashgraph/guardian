import { Policy } from "@entity/policy";
import { BlockModel } from "./block.model";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IArtifacts } from "../interfaces/artifacts.interface";
import { SchemaModel } from "./schema.model";
import { IKeyMap } from "../interfaces/key-map.interface";
import { PropertyModel } from "./property.model";
import { PropertyType } from "../types/property.type";
import { TokenModel } from "./token.model";
import { GroupModel } from "./group.model";
import { TopicModel } from "./topic.model";
import { TemplateTokenModel } from "./template-token.model";
import { RoleModel } from "./role.model";

export class PolicyModel {
    public readonly tree: BlockModel;
    public readonly id: string;
    public readonly description: string;
    public readonly name: string;
    public readonly instanceTopicId: string;
    public readonly version: string;

    private readonly options: ICompareOptions;
    private readonly list: BlockModel[];

    public readonly groups: GroupModel[];
    public readonly topics: TopicModel[];
    public readonly tokens: TemplateTokenModel[];
    public readonly roles: RoleModel[];

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

        this.tree = this.createBlock(policy.config, 0, this.options);
        this.list = this.getAllBlocks(this.tree, []);

        this.roles = this.createRoles(policy.policyRoles, this.options);
        this.groups = this.createGroups(policy.policyGroups, this.options);
        this.topics = this.createTopics(policy.policyTopics, this.options);
        this.tokens = this.createTokens(policy.policyTokens, this.options);
    }

    public setArtifacts(artifacts: IArtifacts[]): PolicyModel {
        this.updateArtifacts(artifacts, this.options);
        return this;
    }

    public setSchemas(schemas: SchemaModel[]): PolicyModel {
        const schemaMap: IKeyMap<SchemaModel> = {};
        for (const schema of schemas) {
            schemaMap[schema.iri] = schema;
        }
        this.updateSchemas(schemaMap, this.options);
        return this;
    }

    public setTokens(tokens: TokenModel[]): PolicyModel {
        const tokenMap: IKeyMap<TokenModel> = {};
        for (const token of tokens) {
            tokenMap[token.tokenId] = token;
        }
        this.updateTokens(tokenMap, this.options);
        return this;
    }

    public update(): PolicyModel {
        const blockMap: IKeyMap<BlockModel> = {};
        for (const block of this.list) {
            blockMap[block.tag] = block;
        }
        this.updateEvents(blockMap, this.options);
        return this;
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
                block.addChildren(this.createBlock(child, i, options));
            }
        }
        block.update(options);
        return block;
    }

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
        // roles = [
        //     "Employee",
        //     "Employer"
        // ]
    }
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
        // groups = [
        //     {
        //         "name": "Organization",
        //         "creator": "Employer",
        //         "members": [
        //             "Employee"
        //         ],
        //         "groupRelationshipType": "Multiple",
        //         "groupAccessType": "Private"
        //     }
        // ]
    }
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
        // topics = [
        //     {
        //         "type": "any",
        //         "name": "Remote Work",
        //         "description": "",
        //         "static": true,
        //         "memoObj": "topic"
        //     }
        // ]
    }
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
        // tokens = [
        //     {
        //         "templateTokenTag": "token_template_0",
        //         "tokenName": "3",
        //         "tokenSymbol": "2",
        //         "tokenType": "fungible",
        //         "decimals": 1,
        //         "enableAdmin": true,
        //         "changeSupply": true,
        //         "enableFreeze": true,
        //         "enableKYC": true,
        //         "enableWipe": true
        //     }
        // ]
    }

    private updateArtifacts(artifacts: IArtifacts[], options: ICompareOptions): void {
        for (const block of this.list) {
            block.updateArtifacts(artifacts, options);
        }
    }

    private updateEvents(map: IKeyMap<BlockModel>, options: ICompareOptions): void {
        for (const block of this.list) {
            block.updateEvents(map, options);
        }
    }

    private updateSchemas(schemaMap: IKeyMap<SchemaModel>, options: ICompareOptions): void {
        for (const block of this.list) {
            block.updateSchemas(schemaMap, options);
        }
    }

    private updateTokens(tokenMap: IKeyMap<TokenModel>, options: ICompareOptions): void {
        for (const block of this.list) {
            block.updateTokens(tokenMap, options);
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

    public getAllProp<T>(type: PropertyType): PropertyModel<T>[] {
        let prop = [];
        for (const block of this.list) {
            prop = [...prop, ...block.getPropList(type)];
        }
        return prop;
    }
}
