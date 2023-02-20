import {
    GenerateUUIDv4,
    GroupRelationshipType,
    PolicyType,
} from '@guardian/interfaces';
import { PolicyRoleModel } from './policy-role.model';
import { PolicyGroupModel } from './policy-group.model';
import { PolicyTokenModel } from './policy-token.model';
import { PolicyEventModel } from './block-event.model';
import { PolicyBlockModel } from './block.model';
import { PolicyModuleModel } from "./module.model";
import { IBlockConfig } from './interfaces/block-config.interface';
import { PolicyTopicModel } from './policy-topic.model';

export class PolicyModel {
    public readonly valid: boolean;
    public readonly id!: string;
    public readonly uuid!: string;
    public readonly codeVersion!: string;
    public readonly creator!: string;
    public readonly owner!: string;
    public readonly createDate!: string;
    public readonly status!: string;
    public readonly topicId!: string;
    public readonly instanceTopicId!: string;
    public readonly synchronizationTopicId!: string;
    public readonly messageId!: string;
    public readonly version!: string;
    public readonly previousVersion!: string;

    private _policyTag!: string;
    private _name!: string;
    private _description!: string;
    private _topicDescription!: string;
    private _config!: PolicyBlockModel;
    private _policyGroups!: PolicyGroupModel[];
    private _policyTopics!: PolicyTopicModel[];
    private _policyTokens!: PolicyTokenModel[];
    private _policyRoles!: PolicyRoleModel[];

    private _tagMap: { [tag: string]: PolicyBlockModel; } = {};
    private _idMap: { [tag: string]: PolicyBlockModel; } = {};
    private _allBlocks!: PolicyBlockModel[];
    private _allEvents!: PolicyEventModel[];
    private _dataSource!: PolicyBlockModel[];
    private _allModules!: PolicyModuleModel[];

    private _changed: boolean;

    public readonly isDraft: boolean = false;
    public readonly isPublished: boolean = false;
    public readonly isDryRun: boolean = false;
    public readonly readonly: boolean = false;

    constructor(policy?: any) {
        this._changed = false;

        if (!policy) {
            this.valid = false;
            return;
        }
        this.valid = true;

        this.id = policy.id;
        this.uuid = policy.uuid || GenerateUUIDv4();
        this.codeVersion = policy.codeVersion;
        this.creator = policy.creator;
        this.owner = policy.owner;
        this.createDate = policy.createDate;
        this.status = policy.status;
        this.topicId = policy.topicId;
        this.instanceTopicId = policy.instanceTopicId;
        this.synchronizationTopicId = policy.synchronizationTopicId;
        this.messageId = policy.messageId;
        this.version = policy.version;
        this.previousVersion = policy.previousVersion;

        this.buildPolicy(policy);
        this.buildBlock(policy.config);

        this.isDraft = this.status === PolicyType.DRAFT;
        this.isPublished = this.status === PolicyType.PUBLISH;
        this.isDryRun = this.status === PolicyType.DRY_RUN;
        this.readonly = this.isPublished || this.isDryRun;
    }

    public get policyTag(): string {
        return this._policyTag;
    }

    public set policyTag(value: string) {
        this._policyTag = value;
        this.changed = true;
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
        this.changed = true;
    }

    public get description(): string {
        return this._description;
    }

    public set description(value: string) {
        this._description = value;
        this.changed = true;
    }

    public get topicDescription(): string {
        return this._topicDescription;
    }

    public set topicDescription(value: string) {
        this._topicDescription = value;
        this.changed = true;
    }

    public get allBlocks(): PolicyBlockModel[] {
        return this._allBlocks;
    }

    public get allEvents(): PolicyEventModel[] {
        return this._allEvents;
    }

    public get allModule(): PolicyModuleModel[] {
        return this._allModules;
    }

    public get root(): PolicyBlockModel {
        return this._config;
    }

    public get dataSource(): PolicyBlockModel[] {
        return this._dataSource;
    }

    public get policyGroups(): PolicyGroupModel[] {
        return this._policyGroups;
    }

    public get policyTopics(): PolicyTopicModel[] {
        return this._policyTopics;
    }

    public get policyTokens(): PolicyTokenModel[] {
        return this._policyTokens;
    }

    public get policyRoles(): PolicyRoleModel[] {
        return this._policyRoles;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
    }

    public getBlock(block: any): PolicyBlockModel | undefined {
        return this._idMap[block.id];
    }

    public getModule(module: any): PolicyModuleModel | undefined {
        if (this._idMap[module.id]?.isModule) {
            return this._idMap[module.id] as PolicyModuleModel;
        }
        return undefined;
    }

    public createTopic(topic: any) {
        const e = new PolicyTopicModel(topic, this);
        this.addTopic(e);
    }

    public addTopic(topic: PolicyTopicModel) {
        this._policyTopics.push(topic);
        this.emitUpdate();
    }

    public removeTopic(topic: PolicyTopicModel) {
        const index = this._policyTopics.findIndex((c) => c.id == topic.id);
        if (index !== -1) {
            this._policyTopics.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createToken(token: any) {
        const e = new PolicyTokenModel(token, this);
        this.addToken(e);
    }

    public addToken(token: PolicyTokenModel) {
        this._policyTokens.push(token);
        this.emitUpdate();
    }

    public removeToken(token: PolicyTokenModel) {
        const index = this._policyTokens.findIndex((c) => c.id == token.id);
        if (index !== -1) {
            this._policyTokens.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createGroup() {
        const e = new PolicyGroupModel({
            name: '',
            creator: '',
            members: [],
            groupRelationshipType: GroupRelationshipType.Multiple
        }, this);
        this.addGroup(e);
    }

    public addGroup(role: PolicyGroupModel) {
        this._policyGroups.push(role);
        this.emitUpdate();
    }

    public removeGroup(role: PolicyGroupModel) {
        const index = this._policyGroups.findIndex((c) => c.id == role.id);
        if (index !== -1) {
            this._policyGroups.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createRole(name: string) {
        const e = new PolicyRoleModel(name, this);
        this.addRole(e);
    }

    public addRole(role: PolicyRoleModel) {
        this._policyRoles.push(role);
        this.emitUpdate();
    }

    public removeRole(role: PolicyRoleModel) {
        const index = this._policyRoles.findIndex((c) => c.id == role.id);
        if (index !== -1) {
            this._policyRoles.splice(index, 1);
            this.emitUpdate();
        }
    }

    private registeredBlock(block: PolicyBlockModel | PolicyModuleModel) {
        if (block.isModule) {
            this._allModules.push(block as PolicyModuleModel);
            for (const event of block.events) {
                this._allEvents.push(event);
            }
        } else {
            this._allBlocks.push(block);
            for (const event of block.events) {
                this._allEvents.push(event);
            }
            for (const child of block.children) {
                this.registeredBlock(child);
            }
        }
    }

    public removeBlock(block: any) {
        const item = this._idMap[block.id];
        if (item) {
            item.remove();
        }
    }

    public removeEvent(event: any) {
        const item = this._allEvents.find(e => e.id == event.id);
        if (item) {
            item.remove();
        }
    }

    private buildPolicy(policy: any) {
        this._policyTag = policy.policyTag;
        this._name = policy.name;
        this._description = policy.description;
        this._topicDescription = policy.topicDescription;


        this._policyRoles = [];
        if (Array.isArray(policy.policyRoles)) {
            for (const role of policy.policyRoles) {
                this._policyRoles.push(new PolicyRoleModel(role, this));
            }
        }

        this._policyGroups = [];
        if (policy.policyGroups && Array.isArray(policy.policyGroups)) {
            for (const group of policy.policyGroups) {
                this._policyGroups.push(new PolicyGroupModel(group, this));
            }
        }

        this._policyTopics = [];
        if (Array.isArray(policy.policyTopics)) {
            for (const topic of policy.policyTopics) {
                this._policyTopics.push(new PolicyTopicModel(topic, this));
            }
        }

        this._policyTokens = [];
        if (Array.isArray(policy.policyTokens)) {
            for (const token of policy.policyTokens) {
                this._policyTokens.push(new PolicyTokenModel(token, this));
            }
        }
    }

    private _buildBlock(config: IBlockConfig, parent: PolicyModuleModel | PolicyBlockModel | null) {
        let block: PolicyModuleModel | PolicyBlockModel;
        if (config.blockType === 'module') {
            block = new PolicyModuleModel(config, parent, this);
        } else {
            block = new PolicyBlockModel(config, parent, this);
        }
        if (Array.isArray(config.children)) {
            for (const childConfig of config.children) {
                const child = this._buildBlock(childConfig, block);
                block.children.push(child);
            }
        }
        return block;
    }

    private buildBlock(config: IBlockConfig) {
        if (!config) {
            config = { blockType: "interfaceContainerBlock" };
        }
        this._config = this._buildBlock(config, null);
        this._config.root = true;
        this._refresh();
    }

    public rebuild(object?: any) {
        if (object) {
            if (object.config) {
                this.buildPolicy(object);
                this.buildBlock(object.config);
            } else {
                this.buildBlock(object);
            }
        }
        this.emitUpdate();
    }

    private _refresh() {
        this._tagMap = {};
        this._idMap = {};
        this._allBlocks = [];
        this._allEvents = [];
        this._allModules = [];
        this.registeredBlock(this._config);

        for (const block of this._allBlocks) {
            this._tagMap[block.tag] = block;
            this._idMap[block.id] = block;
        }

        for (const module of this._allModules) {
            this._tagMap[module.tag] = module;
            this._idMap[module.id] = module;
            module.refresh();
        }

        for (const event of this._allEvents) {
            event.source = this._tagMap[event.sourceTag];
            event.target = this._tagMap[event.targetTag];
        }

        this._dataSource = [this._config];
    }

    public refresh() {
        this._refresh();
        this.emitUpdate();
    }

    public getNewTag(type: string, block?: PolicyBlockModel): string {
        let name = type //'Block';
        for (let i = 1; i < 1000; i++) {
            name = `${type}_${i}`;
            if (!this._tagMap[name]) {
                if (block) {
                    this._tagMap[name] = block;
                }
                return name;
            }
        }
        return type;
    }

    public getJSON(): any {
        const json = {
            id: this.id,
            uuid: this.uuid,
            name: this.name,
            version: this.version,
            previousVersion: this.previousVersion,
            description: this.description,
            topicDescription: this.topicDescription,
            status: this.status,
            creator: this.creator,
            owner: this.owner,
            topicId: this.topicId,
            instanceTopicId: this.instanceTopicId,
            synchronizationTopicId: this.synchronizationTopicId,
            policyTag: this.policyTag,
            messageId: this.messageId,
            codeVersion: this.codeVersion,
            createDate: this.createDate,
            policyRoles: Array<string>(),
            policyTopics: Array<any>(),
            policyTokens: Array<any>(),
            policyGroups: Array<any>(),
            config: null,
        };
        for (const role of this.policyRoles) {
            json.policyRoles.push(role.getJSON());
        }
        for (const group of this._policyGroups) {
            json.policyGroups.push(group.getJSON());
        }
        for (const topic of this._policyTopics) {
            json.policyTopics.push(topic.getJSON());
        }
        for (const token of this._policyTokens) {
            json.policyTokens.push(token.getJSON());
        }
        json.config = this._config.getJSON();
        return json;
    }

    public emitUpdate() {
        this._changed = false;
        if (this._subscriber) {
            this._subscriber();
        }
    }

    private _subscriber!: Function;
    public subscribe(fn: Function) {
        this._subscriber = fn;
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }

    public newModule(template?: any): PolicyModuleModel {
        if (template) {
            const config = JSON.parse(JSON.stringify(template.config));
            config.id = GenerateUUIDv4();
            config.tag = this.getNewTag('Module');
            config.blockType = 'module';
            config.defaultActive = true;
            const module = new PolicyModuleModel(config, null, this);
            this._tagMap[module.tag] = module;
            return module;
        } else {
            const config = {
                id: GenerateUUIDv4(),
                tag: this.getNewTag('Module'),
                blockType: 'module',
                defaultActive: true,
                children: [],
                permissions: []
            };
            const module = new PolicyModuleModel(config, null, this);
            this._tagMap[module.tag] = module;
            return module;
        }
    }

    public convertModule(block: PolicyBlockModel): PolicyModuleModel {
        const module = this.newModule();
        const parent = block.parent;
        if (parent) {
            parent.replace(block, module);
        }
        module.addChild(block);
        return module;
    }
}
