import { GenerateUUIDv4, GroupAccessType, GroupRelationshipType, PolicyType } from '@guardian/interfaces';

export class PolicyRoleModel {
    private readonly policy: PolicyModel;

    public readonly id: string;

    private _name: string;

    private _changed: boolean;

    constructor(name: string, policy: PolicyModel) {
        this._changed = false;
        this.policy = policy;
        this.id = GenerateUUIDv4();
        this._name = name;
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
        this.changed = true;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.policy) {
            this.policy.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.policy.emitUpdate();
    }

    public getJSON(): string {
        return this.name;
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

export class PolicyGroupModel {
    private readonly policy: PolicyModel;

    public readonly id: string;

    private _name: string;
    private _creator: string;
    private _members: string[];

    private _groupRelationshipType: GroupRelationshipType
    private _groupAccessType: GroupAccessType

    private _changed: boolean;

    constructor(
        config: {
            name: string,
            creator: string,
            members: string[],
            groupRelationshipType?: GroupRelationshipType,
            groupAccessType?: GroupAccessType,
        },
        policy: PolicyModel
    ) {
        this._changed = false;
        this.policy = policy;
        this.id = GenerateUUIDv4();
        this._name = config.name;
        this._creator = config.creator;
        this._members = config.members || [];

        this._groupRelationshipType = config.groupRelationshipType === GroupRelationshipType.Multiple ?
            GroupRelationshipType.Multiple : GroupRelationshipType.Single;
        this._groupAccessType = config.groupAccessType === GroupAccessType.Global ?
            GroupAccessType.Global : GroupAccessType.Private;
    }

    public get name(): string {
        return this._name;
    }

    public get creator(): string {
        return this._creator;
    }

    public get members(): string[] {
        return this._members;
    }

    public get groupRelationshipType(): GroupRelationshipType {
        return this._groupRelationshipType;
    }

    public get groupAccessType(): GroupAccessType {
        return this._groupAccessType;
    }

    public set name(value: string) {
        this._name = value;
        this.changed = true;
    }

    public set creator(value: string) {
        this._creator = value;
        this.changed = true;
    }

    public set members(value: string[]) {
        this._members = value;
        this.changed = true;
    }

    public set groupRelationshipType(value: GroupRelationshipType) {
        this._groupRelationshipType = value;
        this.changed = true;
    }

    public set groupAccessType(value: GroupAccessType) {
        this._groupAccessType = value;
        this.changed = true;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.policy) {
            this.policy.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.policy.emitUpdate();
    }

    public getJSON(): any {
        return {
            name: this._name,
            creator: this._creator,
            members: this._members,
            groupRelationshipType: this._groupRelationshipType,
            groupAccessType: this._groupAccessType,
        };
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

export class PolicyTopicModel {
    private readonly policy: PolicyModel;

    public readonly id: string;

    private _name: string;
    private _description: string;
    private _type: string;
    private _static: boolean;
    private _memoObj: string;
    private _memo: string;

    private _changed: boolean;

    constructor(topic: any, policy: PolicyModel) {
        this._changed = false;

        this.policy = policy;
        this.id = topic.id || GenerateUUIDv4();

        this._name = topic.name;
        this._description = topic.description;
        this._type = topic.type;
        this._static = topic.static;
        this._memoObj = topic.memoObj || "topic";
        this._memo = topic.memo;
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

    public get type(): string {
        return this._type;
    }

    public set type(value: string) {
        this._type = value;
        this.changed = true;
    }

    public get static(): boolean {
        return this._static;
    }

    public set static(value: boolean) {
        this._static = value;
        this.changed = true;
    }

    public get memoObj(): string {
        return this._memoObj;
    }

    public set memoObj(value: string) {
        this._memoObj = value;
        this.changed = true;
    }

    public get memo(): string {
        return this._memo;
    }

    public set memo(value: string) {
        this._memo = value;
        this.changed = true;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.policy) {
            this.policy.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.policy.emitUpdate();
    }

    public getJSON(): any {
        return {
            type: this.type,
            name: this.name,
            description: this.description,
            static: this.static,
            memo: this.memo,
            memoObj: this.memoObj
        };
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

export class PolicyEventModel {
    private readonly block: PolicyBlockModel;

    public readonly id: string;

    private _actor: string;
    private _disabled: boolean;
    private _input: string;
    private _output: string;
    private _source: PolicyBlockModel | null;
    private _sourceTag: string;
    private _target: PolicyBlockModel | null;
    private _targetTag: string;

    private _changed: boolean;

    constructor(event: any, block: PolicyBlockModel) {
        this._changed = false;

        this.block = block;
        this.id = event.id || GenerateUUIDv4();

        this._actor = event.actor || "";
        this._disabled = !!event.disabled;
        this._input = event.input || "";
        this._output = event.output || "";

        if (typeof event.source == "string") {
            this._source = null;
            this._sourceTag = event.source || "";
        } else {
            this._source = event.source;
            this._sourceTag = "";
        }

        if (typeof event.target == "string") {
            this._target = null;
            this._targetTag = event.target || "";
        } else {
            this._target = event.target;
            this._targetTag = "";
        }
    }
    public get actor(): string {
        return this._actor;
    }

    public set actor(value: string) {
        this._actor = value;
        this.changed = true;
    }

    public get disabled(): boolean {
        return this._disabled;
    }

    public set disabled(value: boolean) {
        this._disabled = value;
        this.changed = true;
    }

    public get input(): string {
        return this._input;
    }

    public set input(value: string) {
        this._input = value;
        this.changed = true;
    }

    public get output(): string {
        return this._output;
    }

    public set output(value: string) {
        this._output = value;
        this.changed = true;
    }

    public get source(): PolicyBlockModel | null {
        return this._source;
    }

    public set source(value: PolicyBlockModel | null) {
        this._source = value;
        this.changed = true;
    }

    public get sourceTag(): string {
        if (this._source) {
            return this._source.tag;
        }
        return this._sourceTag;
    }

    public get target(): PolicyBlockModel | null {
        return this._target;
    }

    public set target(value: PolicyBlockModel | null) {
        this._target = value;
        this.changed = true;
    }

    public get targetTag(): string {
        if (this._target) {
            return this._target.tag;
        }
        return this._targetTag;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.block) {
            this.block.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.block.emitUpdate();
    }

    public getJSON(): any {
        const json = {
            target: this.targetTag,
            source: this.sourceTag,
            input: this.input,
            output: this.output,
            actor: this.actor,
            disabled: this.disabled
        }
        return json;
    }

    public check(block: PolicyBlockModel): boolean {
        return block.id == this.target?.id || block.id == this.source?.id;
    }

    public isTarget(block: PolicyBlockModel): boolean {
        return block.id == this.target?.id;
    }

    public isSource(block: PolicyBlockModel): boolean {
        return block.id == this.source?.id;
    }

    public remove() {
        if (this.block) {
            this.block.removeEvent(this);
        }
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

export class PolicyBlockModel {
    private readonly policy: PolicyModel;

    public readonly id: string;
    public readonly blockType: string;

    private _parent: PolicyBlockModel | null;
    private _children: PolicyBlockModel[];
    private _events: PolicyEventModel[];

    public readonly properties: { [name: string]: any };

    private _changed: boolean;

    constructor(block: any, parent: PolicyBlockModel | null, policy: PolicyModel) {
        this._changed = false;

        this.policy = policy;

        this.id = block.id || GenerateUUIDv4();
        this.blockType = block.blockType;

        block.tag = block.tag || "";
        if (!Array.isArray(block.permissions)) {
            block.permissions = [];
        }

        this._parent = parent;

        const clone = { ...block };
        delete clone.children;
        delete clone.events;

        this.properties = clone;

        this._children = [];
        if (Array.isArray(block.children)) {
            for (const child of block.children) {
                this._children.push(
                    new PolicyBlockModel(child, this, this.policy)
                )
            }
        }

        this._events = [];
        if (Array.isArray(block.events)) {
            for (const event of block.events) {
                this._events.push(
                    new PolicyEventModel(event, this)
                )
            }
        }
    }

    public get tag(): string {
        return this.properties.tag;
    }

    public set tag(value: string) {
        this.properties.tag = value;
        this.changed = true;
    }

    public get permissions(): string[] {
        return this.properties.permissions;
    }

    public set permissions(value: string[]) {
        this.silentlySetPermissions(value);
        this.changed = true;
    }

    public silentlySetPermissions(value: string[]) {
        if (Array.isArray(value)) {
            this.properties.permissions = value;
        } else {
            this.properties.permissions = [];
        }
    }

    public get children(): PolicyBlockModel[] {
        return this._children;
    }

    public get events(): PolicyEventModel[] {
        return this._events;
    }

    public get parent(): PolicyBlockModel | null {
        return this._parent;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.policy) {
            this.policy.changed = true;
        }
    }

    public get next(): PolicyBlockModel | undefined {
        if (this.parent) {
            const index = this.parent.children.findIndex(c => c.id == this.id);
            let next = this.parent.children[index + 1];
            return next;
        }
        return undefined;
    }

    public get prev(): PolicyBlockModel | undefined {
        if (this.parent) {
            const index = this.parent.children.findIndex(c => c.id == this.id);
            return this.parent.children[index - 1];
        }
        return undefined;
    }

    public remove() {
        if (this.parent) {
            this.parent._removeChild(this);
        }
        this._parent = null;

        this.policy.refresh();
    }

    public removeChild(child: PolicyBlockModel) {
        this._removeChild(child);
        child._parent = null;

        this.policy.refresh();
    }

    public createChild(block: any) {
        delete block.children;
        const child = new PolicyBlockModel(block, this, this.policy);
        if (!child.permissions || !child.permissions.length) {
            child.permissions = this.permissions.slice();
        }
        this._addChild(child);

        this.policy.refresh();
    }

    public copyChild(block: any) {
        this._copyChild(block);
        this.policy.refresh();
    }

    public addChild(child: PolicyBlockModel) {
        this._addChild(child);

        this.policy.refresh();
    }

    private _copyChild(block: any) {
        block.id = GenerateUUIDv4();
        const children = block.children;
        delete block.children;
        delete block.events;

        const newBlock = new PolicyBlockModel(block, this, this.policy);
        newBlock.tag = this.policy.getNewTag(newBlock);
        this._addChild(newBlock);

        if (Array.isArray(children)) {
            for (const child of children) {
                newBlock._copyChild(child);
            }
        }
    }

    private _addChild(child: PolicyBlockModel) {
        this._children.push(child);
    }

    private _removeChild(child: PolicyBlockModel) {
        const index = this._children.findIndex((c) => c.id == child.id);
        if (index !== -1) {
            this._children.splice(index, 1);
        }
    }

    public createEvent(event: any) {
        const e = new PolicyEventModel(event, this);
        this._addEvent(e);

        this.policy.refresh();
    }

    public addEvent(event: PolicyEventModel) {
        this._addEvent(event);

        this.policy.refresh();
    }

    private _addEvent(event: PolicyEventModel) {
        this._events.push(event);
    }

    public removeEvent(event: PolicyEventModel) {
        const index = this._events.findIndex((c) => c.id == event.id);
        if (index !== -1) {
            this._events.splice(index, 1);
            this.policy.refresh();
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.policy.emitUpdate();
    }

    public getJSON(): any {
        const json: any = { ...this.properties };
        json.id = this.id;
        json.blockType = this.blockType;
        json.tag = this.tag;
        json.children = [];
        json.events = [];

        for (const block of this.children) {
            json.children.push(block.getJSON());
        }
        for (const event of this.policy.allEvents) {
            if (event.isSource(this)) {
                json.events.push(event.getJSON());
            }
        }

        return json;
    }

    public rebuild(object: any) {
        delete object.children;
        delete object.events;

        const keys = Object.keys(object);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            this.properties[key] = object[key];
        }

        this.policy.emitUpdate();
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

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
    private _policyRoles!: PolicyRoleModel[];

    private _tagMap: { [tag: string]: PolicyBlockModel; } = {};
    private _idMap: { [tag: string]: PolicyBlockModel; } = {};
    private _allBlocks!: PolicyBlockModel[];
    private _allEvents!: PolicyEventModel[];
    private _dataSource!: PolicyBlockModel[];

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

    public createGroup() {
        const e = new PolicyGroupModel({
            name: '',
            creator: '',
            members: []
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

    private registeredBlock(block: PolicyBlockModel) {
        this._allBlocks.push(block);
        for (const event of block.events) {
            this._allEvents.push(event);
        }
        for (const child of block.children) {
            this.registeredBlock(child);
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

        // if (policy.policyRoles && Array.isArray(policy.policyRoles)) {
        //     for (const role of policy.policyRoles) {
        //         this._policyGroups.push(new PolicyGroupModel({
        //             name: role,
        //             creator: role,
        //             members: [role],
        //         }, this));
        //     }
        // }

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
    }

    private buildBlock(config: any) {
        if (config) {
            this._config = new PolicyBlockModel(config, null, this);
        } else {
            this._config = new PolicyBlockModel({
                blockType: "interfaceContainerBlock"
            }, null, this);
        }
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
        this.registeredBlock(this._config);

        for (const block of this._allBlocks) {
            this._tagMap[block.tag] = block;
            this._idMap[block.id] = block;
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

    public getNewTag(block?: PolicyBlockModel): string {
        let name = 'Block';
        for (let i = 1; i < 1000; i++) {
            name = `Block_${i}`;
            if (!this._tagMap[name]) {
                if (block) {
                    this._tagMap[name] = block;
                }
                return name;
            }
        }
        return 'Block';
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
            policyTag: this.policyTag,
            messageId: this.messageId,
            codeVersion: this.codeVersion,
            createDate: this.createDate,
            policyRoles: Array<string>(),
            policyTopics: Array<any>(),
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
}
