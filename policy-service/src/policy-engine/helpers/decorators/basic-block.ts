import { PolicyBlockDefaultOptions } from '@policy-engine/helpers/policy-block-default-options';
import { EventConfig } from '@policy-engine/interfaces';
import { PolicyBlockDecoratorOptions, PolicyBlockFullArgumentList } from '@policy-engine/interfaces/block-options';
import { PolicyRole, PolicyType } from '@guardian/interfaces';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, ISerializedBlock, } from '../../policy-engine.interface';
import { PolicyComponentsUtils } from '../../policy-components-utils';
import { IPolicyEvent, PolicyLink } from '@policy-engine/interfaces/policy-event';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces/policy-event-type';
import { Logger, DatabaseServer } from '@guardian/common';
import deepEqual from 'deep-equal';
import { IPolicyUser, PolicyUser } from '@policy-engine/policy-user';

/**
 * Basic block decorator
 * @param options
 */
export function BasicBlock<T>(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = class extends constructor {
            constructor(
                public readonly blockType: string,
                public readonly commonBlock: boolean,
                public readonly tag: string | null,
                public defaultActive: boolean,
                protected readonly permissions: PolicyRole[],
                private readonly _uuid: string,
                private readonly _parent: IPolicyBlock,
                private readonly _options: any
            ) {
                super();
            }

            /**
             * Block children
             * @private
             */
            private readonly _children: IPolicyBlock[] = [];

            /**
             * Block children getter
             */
            public get children(): IPolicyBlock[] {
                return this._children
            }

            /**
             * Block UUID getter
             */
            public get uuid(): string {
                return this._uuid
            }

            /**
             * Block options getter
             */
            public get options(): any {
                return this._options;
            }

            /**
             * Block parent getter
             */
            public get parent(): IPolicyBlock {
                return this._parent
            }
        }

        const defaultOptions = Object.assign(options, PolicyBlockDefaultOptions()) as PolicyBlockFullArgumentList;

        return class extends basicClass {
            /**
             * Block type
             */
            static blockType = defaultOptions.blockType;
            /**
             * Block about
             */
            static about = defaultOptions.about;
            /**
             * Old data state
             * @protected
             */
            protected oldDataState: any = {};
            /**
             * Current data state
             * @protected
             */
            protected currentDataState: any = {};
            /**
             * Logger instance
             * @protected
             */
            protected logger: Logger;
            /**
             * Database instance
             * @protected
             */
            protected databaseServer: DatabaseServer;
            /**
             * Policy id
             */
            public policyId: string;
            /**
             * Policy owner
             */
            public policyOwner: string;
            /**
             * Policy instance
             */
            public policyInstance: any;
            /**
             * Topic id
             */
            public topicId: string;
            /**
             * Source links
             */
            public sourceLinks: PolicyLink<any>[];
            /**
             * Target links
             */
            public targetLinks: PolicyLink<any>[];
            /**
             * Actions
             */
            public actions: any[];
            /**
             * Block events
             */
            public events: EventConfig[]
            /**
             * Dry-run
             */
            private _dryRun: string;
            /**
             * Block class name
             */
            public readonly blockClassName = 'BasicBlock';
            /**
             * Block variables
             */
            public readonly variables: any[];

            constructor(
                _uuid: string,
                _defaultActive: boolean,
                _tag: string,
                _permissions: PolicyRole[],
                _parent: IPolicyBlock,
                _options: any
            ) {
                const tag = _tag || defaultOptions.tag;
                const permissions = _permissions || defaultOptions.permissions;
                const parent = _parent || defaultOptions._parent;
                const active = _defaultActive || defaultOptions.defaultActive || !parent;

                super(
                    defaultOptions.blockType,
                    defaultOptions.commonBlock,
                    tag,
                    active,
                    permissions,
                    _uuid,
                    parent,
                    _options
                );
                this._dryRun = null;
                this.logger = new Logger();
                this.databaseServer = new DatabaseServer(this.dryRun);

                if (this.parent) {
                    this.parent.registerChild(this as any as IPolicyBlock);
                }

                this.sourceLinks = [];
                this.targetLinks = [];

                if (!Array.isArray(this.actions)) {
                    this.actions = [];
                }
                this.actions.push([PolicyInputEventType.RunEvent, this.runAction]);
                this.actions.push([PolicyInputEventType.RefreshEvent, this.refreshAction]);

                this.events = [];
                if (Array.isArray(this.options?.events)) {
                    for (const e of this.options.events) {
                        this.events.push(e);
                    }
                }
                if (Array.isArray(this.options?.innerEvents)) {
                    for (const e of this.options.innerEvents) {
                        this.events.push(e);
                    }
                }

                this.variables = defaultOptions.variables || [];
            }

            /**
             * Dry Run id
             */
            public get dryRun(): string {
                return this._dryRun;
            }

            /**
             * Next block in chain
             */
            public get next(): IPolicyBlock {
                if (this.parent) {
                    return this.parent.getNextChild(this.uuid);
                }
                return undefined;
            }

            /**
             * If policy contain multiple groups
             */
            public get isMultipleGroups(): boolean {
                if (
                    this.policyInstance &&
                    this.policyInstance.policyGroups &&
                    this.policyInstance.policyGroups.length
                ) {
                    return true;
                }
                return false;
            }

            /**
             * Before init callback
             */
            public async beforeInit(): Promise<void> {
                if (typeof super.beforeInit === 'function') {
                    await super.beforeInit();
                }
            }

            /**
             * After init callback
             */
            public async afterInit(): Promise<void> {
                await this.restoreState();

                if (typeof super.afterInit === 'function') {
                    await super.afterInit();
                }
            }

            /**
             * Get child by UUID
             * @param uuid
             */
            public getChild(uuid: string): IPolicyBlock {
                if (this.children) {
                    for (const child of this.children) {
                        if (child.uuid === uuid) {
                            return child;
                        }
                    }
                }
                return undefined;
            }

            /**
             * Get child index
             * @param uuid
             */
            public getChildIndex(uuid: string): number {
                if (this.children) {
                    for (let i = 0; i < this.children.length; i++) {
                        if (this.children[i].uuid === uuid) {
                            return i;
                        }
                    }
                }
                return -1;
            }

            /**
             * Get next child
             * @param uuid
             */
            public getNextChild(uuid: string): IPolicyBlock {
                if (typeof super.getNextChild === 'function') {
                    return super.getNextChild(uuid);
                }
                const index = this.getChildIndex(uuid);
                if (index !== -1) {
                    return this.children[index + 1];
                }
            }

            /**
             * Add source link
             * @param link
             */
            public addSourceLink(link: PolicyLink<any>): void {
                this.sourceLinks.push(link)
            }

            /**
             * Add target link
             * @param link
             */
            public addTargetLink(link: PolicyLink<any>): void {
                this.targetLinks.push(link)
            }

            /**
             * Trigger events
             * @param output
             * @param user
             * @param data
             */
            public triggerEvents(output: PolicyOutputEventType, user?: IPolicyUser, data?: any): void {
                for (const link of this.sourceLinks) {
                    if (link.outputType === output) {
                        link.run(user, data);
                    }
                }
            }

            /**
             * Trigger event
             * @param event
             * @param user
             * @param data
             */
            public triggerEvent(event: any, user?: IPolicyUser, data?: any): void {
                console.error('triggerEvent');
            }

            /**
             * Run block action
             * @event PolicyEventType.Run
             * @param {IPolicyEvent} event
             */
            public async runAction(event: IPolicyEvent<any>): Promise<any> {
                const parent = this.parent as any;
                if (parent && (typeof parent.changeStep === 'function')) {
                    await parent.changeStep(event.user, event.data, this);
                }
                let result: any;
                if (typeof super.runAction === 'function') {
                    result = await super.runAction(event);
                }
                return result;
            }

            /**
             * Refresh action
             * @event PolicyEventType.DependencyEvent
             * @param {IPolicyEvent} event
             */
            public async refreshAction(event: IPolicyEvent<any>): Promise<any> {
                if (typeof super.refreshAction === 'function') {
                    return await super.refreshAction(event);
                }
                this.updateBlock(event.data, event.user, this.tag);
            }

            /**
             * Join GET Data
             * @param {IPolicyDocument | IPolicyDocument[]} data
             * @param {IPolicyUser} user
             * @param {AnyBlockType} parent
             */
            public async joinData<U extends IPolicyDocument | IPolicyDocument[]>(
                data: U, user: IPolicyUser, parent: AnyBlockType
            ): Promise<U> {
                if (typeof super.joinData === 'function') {
                    return await super.joinData(data, user, parent);
                }
                return data;
            }

            /**
             * Update block
             * @param state
             * @param user
             * @param tag
             */
            public async updateBlock(state: any, user: IPolicyUser, tag: string) {
                await this.saveState();
                const users: { [x: string]: IPolicyUser } = {};
                if (!this.options.followUser) {
                    if (this.dryRun) {
                        const virtualUser = await DatabaseServer.getVirtualUser(this.policyId);
                        const group = await this.databaseServer.getActiveGroupByUser(this.policyId, virtualUser?.did);
                        users[virtualUser?.did] = (new PolicyUser(virtualUser?.did, !!this.dryRun))
                            .setGroup(group);
                    } else {
                        const allUsers = await this.databaseServer.getAllPolicyUsers(this.policyId);
                        for (const userRole of allUsers) {
                            if (this.permissions.includes(userRole.role)) {
                                users[userRole.did] = PolicyUser.create(userRole, !!this.dryRun);
                            } else if (this.permissions.includes('ANY_ROLE')) {
                                users[userRole.did] = PolicyUser.create(userRole, !!this.dryRun);
                            }
                        }
                        if (this.permissions.includes('OWNER') || this.permissions.includes('ANY_ROLE')) {
                            users[this.policyOwner] = new PolicyUser(this.policyOwner);
                        }
                        if (user) {
                            if (this.permissions.includes(user.role)) {
                                users[user.did] = user;
                            } else if (this.permissions.includes('ANY_ROLE')) {
                                users[user.did] = user;
                            }
                        }
                    }
                } else if (user) {
                    users[user.did] = user;
                }
                for (const item of Object.values(users)) {
                    PolicyComponentsUtils.BlockUpdateFn(this as any, item);
                }
            }

            /**
             * Update internal block state
             * @param state
             * @return {boolean} - true if state was changed
             */
            public updateDataState(user: IPolicyUser, state: any): boolean {
                this.oldDataState[user.id] = this.currentDataState[user.id];
                this.currentDataState[user.id] = { state };
                return !deepEqual(this.currentDataState[user.id], this.oldDataState[user.id], {
                    strict: true
                })
            }

            /**
             * Check if data state was changed
             * @param user
             */
            public checkDataStateDiffer(user): boolean {
                // TODO: Remove hardcode appearance
                return true;

                if (this.blockType === 'policyRolesBlock') {
                    return true;
                }
                return !deepEqual(this.currentDataState[user.id], this.oldDataState[user.id], {
                    strict: true
                })
            }

            /**
             * Set policy owner
             * @param did
             */
            public setPolicyOwner(did: string) {
                this.policyOwner = did;
            }

            /**
             * Set policy instance
             * @param policyId
             * @param policy
             */
            public setPolicyInstance(policyId: string, policy: any) {
                this.policyInstance = policy;
                this.policyId = policyId;
                if (this.policyInstance && this.policyInstance.status === PolicyType.DRY_RUN) {
                    this._dryRun = this.policyId;
                } else {
                    this._dryRun = null;
                }
                this.databaseServer.setDryRun(this._dryRun);
            }

            /**
             * Set topic id
             * @param id
             */
            public setTopicId(id: string): void {
                this.topicId = id;
            }

            /**
             * Register Variables
             */
            public registerVariables(): void {
                const modules = PolicyComponentsUtils.GetModule<any>(this);
                if(!modules) {
                    return;
                }

                for (let index = 0; index < this.permissions.length; index++) {
                    this.permissions[index] = modules.getModuleVariable(this.permissions[index], 'Role');
                }

                for (const variable of this.variables) {
                    PolicyComponentsUtils.ReplaceObjectValue(this, variable.path, (value: any) => {
                        return modules.getModuleVariable(value, variable.type);
                    });
                }
            }

            /**
             * Is block child active
             * @param child
             * @param user
             */
            public isChildActive(child: AnyBlockType, user: IPolicyUser): boolean {
                if (typeof super.isChildActive === 'function') {
                    return super.isChildActive(child, user);
                }
                return true;
            }

            /**
             * Is block active
             * @param user
             */
            isActive(user: IPolicyUser): boolean {
                if (!this.parent) {
                    return true;
                }
                return this.parent.isChildActive(this as any, user);
            }

            /**
             * Save block state
             */
            public async saveState(): Promise<void> {
                const stateFields = PolicyComponentsUtils.GetStateFields(this);
                if (stateFields && (Object.keys(stateFields).length > 0) && this.policyId) {
                    await this.databaseServer.saveBlockState(this.policyId, this.uuid, stateFields);
                }
            }

            /**
             * Restore block state
             */
            public async restoreState(): Promise<void> {
                const stateEntity = await this.databaseServer.getBlockState(this.policyId, this.uuid);

                if (!stateEntity) {
                    return;
                }

                for (const [key, value] of Object.entries(JSON.parse(stateEntity.blockState))) {
                    this[key] = value;
                }
            }

            /**
             * Register block child
             * @param child
             */
            public registerChild(child: IPolicyBlock): void {
                this.children.push(child);
            }

            /**
             * Check user permission
             * @param role
             * @param user
             */
            public hasPermission(role: PolicyRole | null, user: IPolicyUser | null): boolean {
                let hasAccess = false;
                if (this.permissions.includes('NO_ROLE')) {
                    if (!role && user.did !== this.policyOwner) {
                        hasAccess = true;
                    }
                }
                if (this.permissions.includes('ANY_ROLE')) {
                    hasAccess = true;
                }
                if (this.permissions.includes('OWNER')) {
                    if (user && user.did === this.policyOwner) {
                        return true;
                    }
                }
                if (this.permissions.indexOf(role) > -1) {
                    hasAccess = true;
                }
                return hasAccess;
            }

            /**
             * Check Permission and Active
             * @param user
             */
            public async isAvailable(user: IPolicyUser): Promise<boolean> {
                if (this.isActive(user) && this.hasPermission(user.role, user)) {
                    if (this.parent) {
                        return this.parent.isAvailable(user);
                    } else {
                        return true;
                    }
                } else {
                    return false;
                }
            }

            /**
             * Serialize block config
             * @param withUUID
             */
            public serialize(withUUID: boolean = false): ISerializedBlock {
                const obj: ISerializedBlock = {
                    defaultActive: this.defaultActive,
                    permissions: this.permissions,
                    blockType: this.blockType
                };
                if (withUUID) {
                    obj.uuid = this.uuid
                }

                if (this.tag) {
                    obj.tag = this.tag;
                }
                if ((this as any).children && ((this as any).children.length > 0)) {
                    obj.children = [];
                    for (const child of (this as any).children) {
                        obj.children.push(child.serialize(withUUID));
                    }
                }

                return obj;
            }

            /**
             * Block destructor
             */
            public destroy() {
                for (const link of this.sourceLinks) {
                    link.destroy();
                }
                for (const link of this.targetLinks) {
                    link.destroy();
                }
                this.sourceLinks.length = 0;
                this.targetLinks.length = 0;

                if (typeof super.destroy === 'function') {
                    super.destroy();
                }

                for (const child of (this as any).children) {
                    child.destroy();
                }
            }

            /**
             * Write log message
             * @param message
             * @protected
             */
            protected log(message: string) {
                this.logger.info(message, ['GUARDIAN_SERVICE', this.uuid, this.blockType, this.tag, this.policyId]);
            }

            /**
             * Write error message
             * @param message
             * @protected
             */
            protected error(message: string) {
                this.logger.error(message, ['GUARDIAN_SERVICE', this.uuid, this.blockType, this.tag, this.policyId]);
            }

            /**
             * Write warn message
             * @param message
             * @protected
             */
            protected warn(message: string) {
                this.logger.warn(message, ['GUARDIAN_SERVICE', this.uuid, this.blockType, this.tag, this.policyId]);
            }

            /**
             * Add Internal Event Listener
             * @param type
             * @protected
             */
            protected addInternalListener(type: string, callback: Function) {
                PolicyComponentsUtils.AddInternalListener(type, this.policyId, callback);
            }

            /**
             * Trigger Internal Event
             * @param type
             * @param data
             * @protected
             */
            protected triggerInternalEvent(type: string, data: any) {
                PolicyComponentsUtils.TriggerInternalEvent(type, this.policyId, data);
            }
        };
    };
}
