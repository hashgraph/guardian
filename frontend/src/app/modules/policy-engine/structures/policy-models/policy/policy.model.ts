import { BlockType, GenerateUUIDv4, GroupRelationshipType, PolicyType, Schema, Token, } from '@guardian/interfaces';
import { PolicyRole } from './policy-role.model';
import { PolicyGroup } from './policy-group.model';
import { PolicyToken } from './policy-token.model';
import { PolicyTopic } from './policy-topic.model';
import { IModuleVariables } from '../interfaces/module-variables.interface';
import { TopicVariables } from './../variables/topic-variables';
import { TokenTemplateVariables } from './../variables/token-template-variables';
import { GroupVariables } from './../variables/group-variables';
import { RoleVariables } from './../variables/role-variables';
import { TokenVariables } from './../variables/token-variables';
import { SchemaVariables } from './../variables/schema-variables';
import { PolicyBlock } from '../block/block.model';
import { PolicyEvent } from '../block/block-event.model';
import { IBlockConfig } from '../interfaces/block-config.interface';
import { PolicyModule } from '../module/block.model';
import { PolicyFolder, PolicyItem } from '../interfaces/types';
import { TemplateUtils } from '../utils';
import { PolicyTool } from '../tool/block.model';
import { ToolVariables } from '../variables/tool-variables';
import { PolicyNavigationStepModel } from './policy-navigation-step.model';
import { PolicyNavigationModel } from './policy-navigation.model';

export class PolicyTemplate {
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
    private _config!: PolicyBlock;
    private _policyGroups!: PolicyGroup[];
    private _policyTopics!: PolicyTopic[];
    private _policyTokens!: PolicyToken[];
    private _policyRoles!: PolicyRole[];

    private _tagMap: { [tag: string]: PolicyBlock; } = {};
    private _idMap: { [tag: string]: PolicyBlock; } = {};
    private _allBlocks!: PolicyBlock[];
    private _allEvents!: PolicyEvent[];
    private _dataSource!: PolicyBlock[];
    private _allModules!: PolicyModule[];
    private _allTools!: PolicyTool[];
    private _tokens!: Token[];
    private _schemas!: Schema[];
    private _tools: any[];
    private _temporarySchemas!: Schema[];
    private _lastVariables!: IModuleVariables;
    private _changed: boolean;

    private _policyNavigation!: PolicyNavigationModel[];
    private _categories!: string[];
    private _projectSchema!: string;

    public readonly isDraft: boolean = false;
    public readonly isPublished: boolean = false;
    public readonly isDryRun: boolean = false;
    public readonly readonly: boolean = false;
    public readonly isPublishError: boolean = false;

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
        this.isPublishError = this.status === PolicyType.PUBLISH_ERROR;
        this.readonly = this.isPublished || this.isDryRun || this.isPublishError;
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

    public get allBlocks(): PolicyBlock[] {
        return this._allBlocks;
    }

    public get allEvents(): PolicyEvent[] {
        return this._allEvents;
    }

    public get allModule(): PolicyModule[] {
        return this._allModules;
    }

    public get allTools(): PolicyTool[] {
        return this._allTools;
    }

    public get root(): PolicyBlock {
        return this._config;
    }

    public get dataSource(): PolicyBlock[] {
        return this._dataSource;
    }

    public get policyGroups(): PolicyGroup[] {
        return this._policyGroups;
    }

    public get policyTopics(): PolicyTopic[] {
        return this._policyTopics;
    }

    public get policyTokens(): PolicyToken[] {
        return this._policyTokens;
    }

    public get policyRoles(): PolicyRole[] {
        return this._policyRoles;
    }

    public get projectSchema() {
        return this._projectSchema;
    }

    public get policySchemas() {
        return this._schemas;
    }

    public get categories(): string[] {
        return this._categories;
    }

    public get policyNavigation(): PolicyNavigationModel[] {
        return this._policyNavigation;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
    }

    public get tagPrefix(): string {
        return '';
    }

    public get localTag(): string {
        return this._policyTag;
    }

    public get canAddBlocks(): boolean {
        return true;
    }

    public get canAddModules(): boolean {
        return true;
    }

    public get canAddTools(): boolean {
        return true;
    }

    public getBlock(block: any): PolicyItem | undefined {
        return this._idMap[block?.id];
    }

    public getModule(module: any): PolicyFolder | undefined {
        if (this._idMap[module?.id]?.isModule) {
            return this._idMap[module.id] as PolicyModule;
        }
        return undefined;
    }

    public createTopic(topic: any): string {
        topic.name = `New Topic ${this.policyTopics.length}`;
        const e = new PolicyTopic(topic, this);
        this.addTopic(e);
        return topic.name;
    }

    public addTopic(topic: PolicyTopic) {
        this._policyTopics.push(topic);
        this.emitUpdate();
    }

    public removeTopic(topic: PolicyTopic) {
        const index = this._policyTopics.findIndex((c) => c.id == topic.id);
        if (index !== -1) {
            this._policyTopics.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createToken(token: any) {
        const e = new PolicyToken(token, this);
        this.addToken(e);
    }

    public addToken(token: PolicyToken) {
        this._policyTokens.push(token);
        this.emitUpdate();
    }

    public removeToken(token: PolicyToken) {
        const index = this._policyTokens.findIndex((c) => c.id == token.id);
        if (index !== -1) {
            this._policyTokens.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createGroup() {
        const e = new PolicyGroup({
            name: '',
            creator: '',
            members: [],
            groupRelationshipType: GroupRelationshipType.Multiple
        }, this);
        this.addGroup(e);
    }

    public addGroup(role: PolicyGroup) {
        this._policyGroups.push(role);
        this.emitUpdate();
    }

    public removeGroup(role: PolicyGroup) {
        const index = this._policyGroups.findIndex((c) => c.id == role.id);
        if (index !== -1) {
            this._policyGroups.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createRole(name: string) {
        const e = new PolicyRole(name, this);
        this.addRole(e);
    }

    public addRole(role: PolicyRole) {
        this._policyRoles.push(role);
        this.emitUpdate();
    }

    public removeRole(role: PolicyRole) {
        const index = this._policyRoles.findIndex((c) => c.id == role.id);
        if (index !== -1) {
            this._policyRoles.splice(index, 1);
            this.emitUpdate();
        }
    }

    private registeredBlock(block: PolicyItem) {
        if (!block) {
            return;
        }
        if (block.isModule) {
            this._allModules.push(block as PolicyModule);
            this._allBlocks.push(block);
            for (const event of block.events) {
                this._allEvents.push(event);
            }
        } else if (block.isTool) {
            this._allTools.push(block as PolicyTool);
            this._allBlocks.push(block);
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
        this._allEvents = this._allEvents.filter(e => e.id !== event?.id);
        event?.remove();
    }

    public setProjectSchema(value: string) {
        this._projectSchema = value;
        this.emitUpdate();
    }

    public setCategories(categories: string[]) {
        this._categories = categories;
        this.emitUpdate();
    }

    public createStep(role: string, index: number) {
        const e = new PolicyNavigationStepModel({
            name: '',
            block: null,
            level: 1,
        }, this);
        this.addStep(role, e, index);
    }

    public addStep(role: string, step: PolicyNavigationStepModel, index: number) {
        for (const nav of this._policyNavigation) {
            if (nav.role === role) {
                nav.steps.splice(index, 0, step);
            }
        }

        this.emitUpdate();
    }

    public removeStep(role: string, step: PolicyNavigationStepModel) {
        for (const nav of this._policyNavigation) {
            let index = -1;
            if (nav.role === role) {
                index = nav.steps.findIndex((c) => c.id == step.id);
            }
            if (index !== -1) {
                nav.steps.splice(index, 1);
                this.emitUpdate();
            }
        }
    }

    private buildPolicy(policy: any) {
        this._policyTag = policy.policyTag;
        this._name = policy.name;
        this._description = policy.description;
        this._topicDescription = policy.topicDescription;
        this._projectSchema = policy.projectSchema;
        this._categories = policy.categories;

        this._policyRoles = [];
        if (Array.isArray(policy.policyRoles)) {
            for (const role of policy.policyRoles) {
                this._policyRoles.push(new PolicyRole(role, this));
            }
        }

        this._policyNavigation = [];
        if (Array.isArray(policy.policyRoles)) {
            for (const role of policy.policyRoles) {
                this._policyNavigation.push(new PolicyNavigationModel({role, steps: []}, this));
            }
        }
        this._policyNavigation.push(new PolicyNavigationModel({role: 'NO_ROLE', steps: []}, this));
        this._policyNavigation.push(new PolicyNavigationModel({role: 'OWNER', steps: []}, this));

        if (policy.policyNavigation && Array.isArray(policy.policyNavigation)) {
            for (const nav of policy.policyNavigation) {
                const navigation = this._policyNavigation.find((item: any) => item.role === nav.role);
                if (navigation) {
                    const steps: PolicyNavigationStepModel[] = [];
                    nav.steps.forEach((step: PolicyNavigationStepModel) => {
                        steps.push(new PolicyNavigationStepModel(step, this))
                    })
                    navigation.steps = steps;
                }
            }
        }

        this._policyGroups = [];
        if (policy.policyGroups && Array.isArray(policy.policyGroups)) {
            for (const group of policy.policyGroups) {
                this._policyGroups.push(new PolicyGroup(group, this));
            }
        }

        this._policyTopics = [];
        if (Array.isArray(policy.policyTopics)) {
            for (const topic of policy.policyTopics) {
                this._policyTopics.push(new PolicyTopic(topic, this));
            }
        }

        this._policyTokens = [];
        if (Array.isArray(policy.policyTokens)) {
            for (const token of policy.policyTokens) {
                this._policyTokens.push(new PolicyToken(token, this));
            }
        }
    }

    private _buildBlock(
        config: IBlockConfig,
        parent: PolicyModule | PolicyBlock | null,
        module: PolicyModule | PolicyTemplate
    ) {
        let block: PolicyModule | PolicyBlock;
        if (config.blockType === 'module') {
            block = new PolicyModule(config, parent);
            block.setModule(module);
            module = block as PolicyModule;
        } else {
            block = new PolicyBlock(config, parent);
            block.setModule(module);
        }
        if (Array.isArray(config.children)) {
            for (const childConfig of config.children) {
                const child = this._buildBlock(childConfig, block, module);
                block.children.push(child);
            }
        }
        return block;
    }

    private buildBlock(config: IBlockConfig) {
        if (!config) {
            config = { blockType: 'interfaceContainerBlock' };
        }
        this._config = TemplateUtils.buildBlock(config, null, this) as PolicyBlock;
        this._config.isRoot = true;
        this._refreshData();
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

    private _refreshData() {
        this._tagMap = {};
        this._idMap = {};
        this._allBlocks = [];
        this._allEvents = [];
        this._allModules = [];
        this._allTools = [];
        this.registeredBlock(this._config);

        for (const block of this._allBlocks) {
            this._tagMap[block.tag] = block;
            this._idMap[block.id] = block;
        }

        for (const module of this._allModules) {
            this._tagMap[module.tag] = module;
            this._idMap[module.id] = module;
            module.refreshData();
        }

        for (const tool of this._allTools) {
            this._tagMap[tool.tag] = tool;
            this._idMap[tool.id] = tool;
            tool.refreshData();
        }

        for (const event of this._allEvents) {
            if (event.sourceTag) {
                event.source = this._tagMap[event.sourceTag];
            }
            if (event.targetTag) {
                event.target = this._tagMap[event.targetTag];
            }
        }

        for (const nav of this._policyNavigation) {
            for (const step of nav.steps) {
                if (step.blockTag) {
                    step.block = this._tagMap[step.blockTag];
                }
            }
        }

        this._dataSource = [this._config];

        this.updateVariables();
    }

    public getNewTag(type: string, block?: PolicyBlock): string {
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

    public setPolicyInfo(policyData: {
        name: string,
        description: string,
        topicDescription: string
    }) {
        if (!policyData) {
            return;
        }
        this.name = policyData.name;
        this.description = policyData.description;
        this.topicDescription = policyData.topicDescription;
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
            projectSchema: this.projectSchema,
            categories: this.categories,
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
            policyNavigation: Array<any>(),
            policyTopics: Array<any>(),
            policyTokens: Array<any>(),
            policyGroups: Array<any>(),
            config: null,
        };
        for (const role of this.policyRoles) {
            json.policyRoles.push(role.getJSON());
        }
        for (const nav of this._policyNavigation) {
            json.policyNavigation.push(nav.getJSON());
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
        this.updateVariables();
        this._changed = false;
        if (this._subscriber) {
            this._subscriber();
        }
    }

    private _subscriber!: Function;
    public subscribe(fn: Function) {
        this._changed = false;
        this._subscriber = fn;
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }

    public newTool(template?: any): PolicyTool {
        if (template) {
            const config: any = {
                id: GenerateUUIDv4(),
                tag: this.getNewTag('Tool'),
                blockType: BlockType.Tool,
                defaultActive: true,
                hash: template.hash,
                messageId: template.messageId,
                inputEvents: template.config?.inputEvents,
                outputEvents: template.config?.outputEvents,
                variables: template.config?.variables
            }
            const tool = TemplateUtils.buildBlock(config, null, this) as PolicyTool;
            this._tagMap[tool.tag] = tool;
            return tool;
        } else {
            throw new Error('Invalid tool config');
        }
    }

    public newModule(template?: any): PolicyModule {
        if (template) {
            const config = JSON.parse(JSON.stringify(template.config));
            config.id = GenerateUUIDv4();
            config.tag = this.getNewTag('Module');
            config.blockType = BlockType.Module;
            config.defaultActive = true;
            const module = TemplateUtils.buildBlock(config, null, this) as PolicyModule;
            this._tagMap[module.tag] = module;
            return module;
        } else {
            const config = {
                id: GenerateUUIDv4(),
                tag: this.getNewTag('Module'),
                blockType: BlockType.Module,
                defaultActive: true,
                children: [],
                permissions: []
            };
            const module = new PolicyModule(config, null);
            module.setModule(this);
            this._tagMap[module.tag] = module;
            return module;
        }
    }

    public convertModule(block: PolicyBlock): PolicyModule {
        const permission = block.permissions?.slice();
        const module = this.newModule();
        const parent = block.parent;
        if (parent) {
            parent._replace(block, module);
        }
        module.addChild(block);
        for (const block of module.allBlocks) {
            block.setModule(module);
        }
        module.permissions = permission;
        this.refresh();
        return module;
    }

    private updateVariables(): void {
        this._lastVariables = {
            module: this,
            tools: [],
            schemas: [
                new SchemaVariables(),
            ],
            tokens: [
                new TokenVariables(),
            ],
            roles: [
                new RoleVariables('Owner', 'OWNER'),
                new RoleVariables('No Role', 'NO_ROLE'),
                new RoleVariables('Any Role', 'ANY_ROLE')
            ],
            groups: [
                new GroupVariables(),
            ],
            tokenTemplates: [
                new TokenTemplateVariables(),
            ],
            topics: [
                new TopicVariables(),
            ]
        }
        if (Array.isArray(this._tools)) {
            for (const tool of this._tools) {
                this._lastVariables.tools.push(new ToolVariables(tool));
            }
        }
        if (Array.isArray(this._schemas)) {
            for (const schema of this._schemas) {
                this._lastVariables.schemas.push(new SchemaVariables(schema));
            }
        }
        if (Array.isArray(this._temporarySchemas)) {
            for (const schema of this._temporarySchemas) {
                this._lastVariables.schemas.push(new SchemaVariables(schema));
            }
        }
        if (Array.isArray(this._tokens)) {
            for (const token of this._tokens) {
                this._lastVariables.tokens.push(new TokenVariables(token));
            }
        }
        if (Array.isArray(this._policyRoles)) {
            for (const role of this._policyRoles) {
                this._lastVariables.roles.push(new RoleVariables(role));
            }
        }
        if (Array.isArray(this._policyGroups)) {
            for (const group of this._policyGroups) {
                this._lastVariables.groups.push(new GroupVariables(group));
            }
        }
        if (Array.isArray(this._policyTokens)) {
            for (const tokenTemplate of this._policyTokens) {
                this._lastVariables.tokenTemplates.push(new TokenTemplateVariables(tokenTemplate));
            }
        }
        if (Array.isArray(this._policyTopics)) {
            for (const topic of this._policyTopics) {
                this._lastVariables.topics.push(new TopicVariables(topic));
            }
        }
    }

    public setSchemas(schemas: Schema[]): void {
        this._schemas = schemas;
        this.updateVariables();
    }

    public setTools(tools: any[]): void {
        this._tools = tools;
        this.updateVariables();
    }

    public setTemporarySchemas(schemas: Schema[]): void {
        this._temporarySchemas = schemas;
        this.updateVariables();
    }

    public setTokens(tokens: Token[]): void {
        this._tokens = tokens;
        this.updateVariables();
    }

    public get blockVariables(): IModuleVariables | null {
        return this._lastVariables;
    }

    public get moduleVariables(): IModuleVariables | null {
        return null;
    }

    public getRootModule(): PolicyFolder {
        return this;
    }

    public refreshData() {
        this._refreshData();
        this.emitUpdate();
    }

    public refresh(): void {
        this.refreshData();
    }

    public getPermissionsNumber(permission: string): number {
        if (this._policyRoles) {
            for (let index = 0; index < this._policyRoles.length; index++) {
                if (this._policyRoles[index].name === permission) {
                    return index;
                }
            }
        }
        return -1;
    }

    public getPermissionsName(permission: any): any {
        if (permission === 'OWNER') {
            return 'Owner';
        } else if (permission === 'NO_ROLE') {
            return 'No Role';
        } else if (permission === 'ANY_ROLE') {
            return 'Any Role';
        } else {
            return this._policyRoles[permission]?.name;
        }
    }

    public getAllTools(): Set<string> {
        const map = new Set<string>();
        if (this.allTools) {
            for (const tool of this.allTools) {
                if (tool.messageId) {
                    map.add(tool.messageId);
                }
            }
        }
        if (this.allModule) {
            for (const m of this.allModule) {
                if (m.allTools) {
                    for (const tool of m.allTools) {
                        if (tool.messageId) {
                            map.add(tool.messageId);
                        }
                    }
                }
            }
        }
        return map;
    }
}
