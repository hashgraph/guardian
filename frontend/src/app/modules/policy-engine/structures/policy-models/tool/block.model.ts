import { IModuleVariables } from '../interfaces/module-variables.interface';
import { IModuleConfig } from '../interfaces/module-config.interface';
import { GroupVariables } from '../variables/group-variables';
import { RoleVariables } from '../variables/role-variables';
import { SchemaVariables } from '../variables/schema-variables';
import { TokenTemplateVariables } from '../variables/token-template-variables';
import { TokenVariables } from '../variables/token-variables';
import { TopicVariables } from '../variables/topic-variables';
import { IBlockConfig } from '../interfaces/block-config.interface';
import { IEventConfig } from '../interfaces/event-config.interface';
import { BlockType, GenerateUUIDv4, Schema, Token } from '@guardian/interfaces';
import { PolicyBlock } from '../block/block.model';
import { PolicyEvent } from '../block/block-event.model';
import { PolicyFolder, PolicyItem } from '../interfaces/types';
import { TemplateUtils } from '../utils';
import { ModuleEvent } from '../variables/module-event.model';
import { ModuleVariable } from '../variables/module-variable.model';
import { ToolVariables } from '../variables/tool-variables';

export class PolicyTool extends PolicyBlock {
    protected _dataSource!: PolicyBlock[];
    protected _tagMap: { [tag: string]: PolicyBlock; } = {};
    protected _idMap: { [tag: string]: PolicyBlock; } = {};
    protected _allBlocks!: PolicyBlock[];
    protected _allTools!: PolicyTool[];
    protected _allEvents!: PolicyEvent[];
    protected _inputEvents!: ModuleEvent[];
    protected _outputEvents!: ModuleEvent[];
    protected _variables!: ModuleVariable[];
    protected _innerEvents!: PolicyEvent[];
    protected _lastVariables!: IModuleVariables;
    protected _schemas: Schema[];
    protected _tools: any[];
    protected _temporarySchemas: Schema[];
    protected _tokens!: Token[];
    protected _name!: string;
    protected _description!: string;
    protected _previousVersion!: string;
    protected _version!: string;

    public get innerEvents(): PolicyEvent[] {
        return this._innerEvents;
    }

    public get allEvents(): PolicyEvent[] {
        return this._allEvents;
    }

    public get allBlocks(): PolicyBlock[] {
        return this._allBlocks;
    }

    public get allTools(): PolicyTool[] {
        return this._allTools;
    }

    public get root(): PolicyBlock {
        return this;
    }

    public get messageId(): string {
        return this.properties.messageId;
    }

    public get policyId(): string | undefined {
        return this._module?.policyId;
    }

    public get isDraft(): boolean {
        return this._module ? this._module.isDraft : true;
    }

    constructor(config: IModuleConfig, parent: PolicyBlock | null) {
        super(config, parent);
    }

    public init(config: IModuleConfig, parent: PolicyBlock | null) {
        super.init(config, parent);
        this._name = config.name || '';
        this._description = config.description || '';
        this._previousVersion = config.previousVersion || '';
        this._version = config.version || '';

        this._inputEvents = [];
        if (config.inputEvents && Array.isArray(config.inputEvents)) {
            for (const event of config.inputEvents) {
                this._inputEvents.push(new ModuleEvent(event, this));
            }
        }

        this._outputEvents = [];
        if (config.outputEvents && Array.isArray(config.outputEvents)) {
            for (const event of config.outputEvents) {
                this._outputEvents.push(new ModuleEvent(event, this));
            }
        }

        this._variables = [];
        if (config.variables && Array.isArray(config.variables)) {
            for (const variable of config.variables) {
                this._variables.push(new ModuleVariable(variable, this));
            }
        }

        this._innerEvents = [];
        if (Array.isArray(config.innerEvents)) {
            for (const event of config.innerEvents) {
                const item = new PolicyEvent(event, this);
                this._innerEvents.push(item);
            }
        }
    }

    public get dataSource(): PolicyBlock[] {
        return this._dataSource;
    }

    public override setModule(module?: PolicyFolder): void {
        if (module !== this) {
            this._module = module;
        } else {
            console.error('Invalid module');
        }
    }

    private registeredBlock(block: PolicyItem) {
        if (block === this) {
            this._allBlocks.push(block);
            for (const event of this.innerEvents) {
                this._allEvents.push(event);
            }
            for (const child of block.children) {
                this.registeredBlock(child);
            }
        } else if (block.isModule) {
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

    public get isModule(): boolean {
        return false;
    }

    public get isTool(): boolean {
        return true;
    }

    public get isPolicy(): boolean {
        return false;
    }

    public get isTest(): boolean {
        if(this._module) {
            return this._module.isTest;
        }
        return false;
    }

    public get rootParent(): PolicyBlock {
        if (this._parent) {
            return this._parent.rootParent;
        } else {
            return this;
        }
    }

    public get canAddBlocks(): boolean {
        return true;
    }

    public get canAddModules(): boolean {
        return false;
    }

    public get canAddTools(): boolean {
        return true;
    }

    public get expandable(): boolean {
        return false;
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this.setNameSilently(value);
        this._changed = true;
    }

    public setNameSilently(value: string) {
        this._name = value;
    }

    public get description(): string {
        return this._description;
    }

    public set description(value: string) {
        this.setDescriptionSilently(value);
        this._changed = true;
    }

    public setDescriptionSilently(value: string) {
        this._description = value;
    }

    public get previousVersion(): string {
        return this._previousVersion;
    }

    public set previousVersion(value: string) {
        this.setPreviousVersionSilently(value);
        this._changed = true;
    }

    public setPreviousVersionSilently(value: string) {
        this._previousVersion = value;
    }

    public get version(): string {
        return this._version;
    }

    public set version(value: string) {
        this.setVersionSilently(value);
        this._changed = true;
    }

    public setVersionSilently(value: string) {
        this._version = value;
    }

    public get inputEvents(): ModuleEvent[] {
        return this._inputEvents;
    }

    public get outputEvents(): ModuleEvent[] {
        return this._outputEvents;
    }

    public get variables(): ModuleVariable[] {
        return this._variables;
    }

    public get tagPrefix(): string {
        return '';
    }

    public get tag(): string {
        return this._tag;
    }

    public removeEvent(event: any) {
        this._allEvents = this._allEvents.filter(e => e.id !== event?.id);
        this._innerEvents = this._innerEvents.filter(e => e.id !== event?.id);
        this._events = this._events.filter(e => e.id !== event?.id);
        event?.remove();
    }

    public removeBlock(block: any) {
        const item = this._idMap[block.id];
        if (item) {
            item.remove();
        }
    }

    public getBlock(block: any): PolicyBlock | undefined {
        return this._idMap[block?.id];
    }

    public getNewTag(type: string): string {
        let name = type;
        for (let i = 1; i < 1000; i++) {
            name = `${type}_${i}`;
            if (!this._tagMap[name]) {
                return name;
            }
        }
        return `${type}`;
    }

    public createInputEvent() {
        const e = new ModuleEvent({
            name: '',
            description: ''
        }, this);
        this.addInputEvent(e);
    }

    public addInputEvent(event: ModuleEvent) {
        this._changed = true;
        this._inputEvents.push(event);
        this.emitUpdate();
    }

    public removeInputEvent(event: ModuleEvent) {
        this._changed = true;
        const index = this._inputEvents.findIndex((c) => c.id == event.id);
        if (index !== -1) {
            this._inputEvents.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createOutputEvent() {
        const e = new ModuleEvent({
            name: '',
            description: ''
        }, this);
        this.addOutputEvent(e);
    }

    public addOutputEvent(event: ModuleEvent) {
        this._changed = true;
        this._outputEvents.push(event);
        this.emitUpdate();
    }

    public removeOutputEvent(event: ModuleEvent) {
        this._changed = true;
        const index = this._outputEvents.findIndex((c) => c.id == event.id);
        if (index !== -1) {
            this._outputEvents.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createVariable(type?: string, name?: string): void {
        const e = new ModuleVariable({
            name: name || '',
            description: '',
            type: type || 'String',
        }, this);
        this.addVariable(e);
    }

    public addVariable(variable: ModuleVariable) {
        this._changed = true;
        this._variables.push(variable);
        this.emitUpdate();
    }

    public removeVariable(variable: ModuleVariable) {
        this._changed = true;
        const index = this._variables.findIndex((c) => c.id == variable.id);
        if (index !== -1) {
            this._variables.splice(index, 1);
            this.emitUpdate();
        }
    }

    public override getJSON(): any {
        const json: any = {
            ...this.properties
        };
        delete json.children;
        delete json.events;
        delete json.artifacts;
        delete json.variables;
        delete json.inputEvents;
        delete json.outputEvents;
        delete json.innerEvents;
        json.id = this.id;
        json.blockType = this.blockType;
        json.tag = this.tag;
        json.children = [];
        json.events = [];
        json.artifacts = this.artifacts || [];
        json.variables = [];
        json.inputEvents = [];
        json.outputEvents = [];
        json.innerEvents = [];

        for (const variable of this.variables) {
            json.variables.push(variable.getJSON());
        }
        for (const event of this.inputEvents) {
            json.inputEvents.push(event.getJSON());
        }
        for (const event of this.outputEvents) {
            json.outputEvents.push(event.getJSON());
        }

        if (this._module) {
            for (const event of this._module.allEvents) {
                if (event.isSource(this)) {
                    json.events.push(event.getJSON());
                }
            }
        }

        for (const event of this.allEvents) {
            if (event.isSource(this)) {
                json.innerEvents.push(event.getJSON());
            }
        }

        for (const block of this.children) {
            json.children.push(block.getJSON());
        }
        return json;
    }

    public setSchemas(schemas: Schema[]): void {
        this._schemas = schemas;
        this.updateVariables();
    }

    public setTools(tools: any[]): void {
        this._tools = tools;
        this.updateVariables();
    }

    public setTokens(tokens: Token[]): void {
    }

    public setTemporarySchemas(schemas: Schema[]): void {
        this._temporarySchemas = schemas;
        this.updateVariables();
    }

    public get blockVariables(): IModuleVariables | null {
        return this._lastVariables;
    }

    public get moduleVariables(): IModuleVariables | null {
        if (this._module) {
            return this._module.blockVariables;
        }
        return null;
    }

    public getSchemas(): Schema[] {
        return this._schemas;
    }

    public getTemporarySchemas(): Schema[] {
        return this._temporarySchemas;
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
        if (this._variables) {
            for (const variable of this._variables) {
                switch (variable.type) {
                    case 'Schema':
                        let baseSchema: Schema | undefined;
                        if (typeof variable?.baseSchema === 'string') {
                            baseSchema = this._schemas?.find(s => s.iri === variable.baseSchema);
                        } else if (typeof variable?.baseSchema === 'object') {
                            baseSchema = new Schema(variable.baseSchema);
                        }
                        this._lastVariables.schemas.push(new SchemaVariables(variable, undefined, baseSchema));
                        break;
                    case 'Token':
                        this._lastVariables.tokens.push(new TokenVariables(variable));
                        break;
                    case 'Role':
                        this._lastVariables.roles.push(new RoleVariables(variable));
                        break;
                    case 'Group':
                        this._lastVariables.groups.push(new GroupVariables(variable));
                        break;
                    case 'TokenTemplate':
                        this._lastVariables.tokenTemplates.push(new TokenTemplateVariables(variable));
                        break;
                    case 'Topic':
                        this._lastVariables.topics.push(new TopicVariables(variable));
                        break;
                }
            }
        }
        TemplateUtils.checkSchemaVariables(this._lastVariables.schemas);
    }

    public override emitUpdate() {
        this.updateVariables();
        this._changed = false;
        if (this._module) {
            this._module.emitUpdate();
        }
    }

    public createTopic(topic: any): string {
        const topics = this._variables.filter(e => e.type === 'Topic');
        const name = `New Topic ${topics.length}`;
        this.createVariable('Topic', name);
        return name;
    }

    public getRootModule(): PolicyFolder {
        return this;
    }

    public override createChild(block: IBlockConfig, index?: number) {
        block.tag = this.getNewTag('Block');
        const newBlock = this._createChild(block, this, index);
        this.refresh();
        return newBlock;
    }

    public override pasteChild(block: IBlockConfig) {
        this._pasteChild(block, this);
        this.refresh();
    }

    public refreshData() {
        this._tagMap = {};
        this._idMap = {};
        this._allBlocks = [];
        this._allEvents = [];
        this._allTools = [];
        this.registeredBlock(this);
        for (const block of this._allBlocks) {
            this._tagMap[block.tag] = block;
            this._idMap[block.id] = block;
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
        this._dataSource = [this];
        this.updateVariables();
    }

    public override refresh(): void {
        if (this._module) {
            this._module.refresh();
        } else {
            this.refreshData();
        }
    }

    public createInnerEvent(event: IEventConfig) {
        const e = new PolicyEvent(event, this);
        this._addInnerEvent(e);
        this.refresh();
    }

    public addInnerEvent(event: PolicyEvent) {
        this._addInnerEvent(event);
        this.refresh();
    }

    private _addInnerEvent(event: PolicyEvent) {
        this._innerEvents.push(event);
    }

    public removeInnerEvent(event: PolicyEvent) {
        const index = this._innerEvents.findIndex((c) => c.id == event.id);
        if (index !== -1) {
            this._innerEvents.splice(index, 1);
            this.refresh();
        }
    }

    public getActiveEvents(): PolicyEvent[] {
        const events = super.getActiveEvents();
        for (const event of this.innerEvents) {
            if (!event.disabled) {
                events.push(event);
            }
        }
        return events;
    }

    public getPermissionsNumber(permission: string): number {
        if (this._variables) {
            let index = -1;
            for (const variable of this._variables) {
                if (variable.type === 'Role') {
                    index++;
                    if (variable.name === permission) {
                        return index;
                    }
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
            if (this._variables) {
                let index = -1;
                for (const variable of this._variables) {
                    if (variable.type === 'Role') {
                        index++;
                        if (index == permission) {
                            return variable.name;
                        }
                    }
                }
            }
            return null;
        }
    }

    public rebuild(object?: any) {
        this.init(object, this.parent);
        if (object.children) {
            for (const child of object.children) {
                this.children.push(TemplateUtils.buildBlock(child, this, this));
            }
        }
        this.refreshData();
        this.emitUpdate();
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

    public getTools(): Set<string> {
        const map = new Set<string>();
        if (this._allTools) {
            for (const tool of this._allTools) {
                if (tool.messageId) {
                    map.add(tool.messageId);
                }
            }
        }
        return map;
    }

    public getEnvironments(): any {
        return {
            name: this._name,
            description: this._description,
            previousVersion: this._previousVersion,
            version: this._version,
            localTag: this._localTag,
            tag: this._tag,
            lastPrefix: this._lastPrefix,
            schemas: this._schemas,
            tools: this._tools,
            tokens: this._tokens,
            temporarySchemas: this._temporarySchemas
        }
    }

    public setEnvironments(env: any): void {
        if (env) {
            this._name = env.name;
            this._description = env.description;
            this._previousVersion = env.previousVersion;
            this._version = env.version;
            this._localTag = env.localTag;
            this._tag = env.tag;
            this._lastPrefix = env.lastPrefix;
            this._schemas = env.schemas;
            this._tools = env.tools;
            this._tokens = env.tokens;
            this._temporarySchemas = env.temporarySchemas;
            this.updateVariables();
        }
    }
}
