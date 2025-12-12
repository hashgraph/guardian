import { PolicyBlockDefaultOptions } from '../../helpers/policy-block-default-options.js';
import { BlockCacheType, EventConfig } from '../../interfaces/index.js';
import { PolicyBlockDecoratorOptions, PolicyBlockFullArgumentList } from '../../interfaces/block-options.js';
import { LocationType, PolicyAvailability, PolicyHelper, PolicyRole, PolicyStatus } from '@guardian/interfaces';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, ISerializedBlock, } from '../../policy-engine.interface.js';
import { PolicyComponentsUtils } from '../../policy-components-utils.js';
import { IPolicyEvent, PolicyLink } from '../../interfaces/policy-event.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../../interfaces/policy-event-type.js';
import { DatabaseServer, Policy } from '@guardian/common';
import deepEqual from 'deep-equal';
import { PolicyUser } from '../../policy-user.js';
import { ComponentsService } from '../components-service.js';
import { IDebugContext } from '../../block-engine/block-result.js';
import { RecordActionStep } from '../../record-action-step.js';

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
            public static blockType = defaultOptions.blockType;
            /**
             * Block about
             */
            public static about = defaultOptions.about;
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
             * Policy id
             */
            public policyId: string;
            /**
             * Policy message id
             */
            public messageId: string;
            /**
             * Policy owner
             */
            public policyOwner: string;
            /**
             * Policy instance
             */
            public policyInstance: Policy;
            /**
             * Topic id
             */
            public topicId: string;
            /**
             * Topic id
             */
            public toolId: string;
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
            /**
             * Components service
             */
            public readonly components: ComponentsService;
            /**
             * Database service
             */
            public readonly databaseServer: DatabaseServer;
            /**
             * Block about
             */
            public readonly actionType: LocationType;
            // /**
            //  * Current action status
            //  */
            // public actionStatus?: RecordActionStep;

            constructor(
                _uuid: string,
                _defaultActive: boolean,
                _tag: string,
                _permissions: PolicyRole[],
                _parent: IPolicyBlock,
                _options: any,
                _components: ComponentsService
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
                this.components = _components;
                this.databaseServer = this.components.databaseServer;
                this._dryRun = null;

                if (this.parent) {
                    this.parent.registerChild(this as any as IPolicyBlock);
                }

                this.sourceLinks = [];
                this.targetLinks = [];

                if (Array.isArray(super.actions)) {
                    this.actions = [...super.actions]
                } else {
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
                this.actionType = defaultOptions.actionType || LocationType.REMOTE;
            }

            /**
             * Dry Run id
             */
            public get dryRun(): string {
                return this._dryRun;
            }

            /**
             * Policy status
             */
            public get policyStatus(): PolicyStatus | null {
                return this.policyInstance?.status || null;
            }

            /**
             * Policy availability
             */
            public get policyAvailability(): PolicyAvailability | null {
                return this.policyInstance?.availability || null;
            }

            /**
             * Policy location
             */
            public get locationType(): LocationType | null {
                return this.policyInstance?.locationType || null;
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
                if (
                    !this.sourceLinks.some((sourceLink) =>
                        sourceLink.equals(link)
                    )
                ) {
                    this.sourceLinks.push(link);
                }
            }

            /**
             * Add target link
             * @param link
             */
            public addTargetLink(link: PolicyLink<any>): void {
                if (
                    !this.targetLinks.some((targetLink) =>
                        targetLink.equals(link)
                    )
                ) {
                    this.targetLinks.push(link);
                }
            }

            /**
             * Trigger events
             * @param output
             * @param user
             * @param data
             */
            public triggerEvents<U>(
                output: PolicyOutputEventType,
                user: PolicyUser,
                data: U,
                actionStatus: any
            ): void {
                // const status = actionStatus ?? this.actionStatus;
                const status = actionStatus;
                console.log(actionStatus, 'actionStatus 111');
                console.log(data, 'data 111');
                console.log(this.sourceLinks, 'this.sourceLinks 111');
                if (!this.sourceLinks.length) {
                    actionStatus?.dec();
                }

                for (const link of this.sourceLinks) {
                    if (link.outputType === output) {
                        link.run(user, data, status);
                    } else {
                        actionStatus?.dec();
                    }
                }
            }

            /**
             * Sync Trigger events
             * @param output
             * @param user
             * @param data
             */
            public async triggerEventSync<U>(
                output: PolicyOutputEventType,
                user: PolicyUser,
                data: U,
                actionStatus: any
            ): Promise<any> {
                // const status = actionStatus ?? this.actionStatus;
                const status = actionStatus;
                console.log(actionStatus, 'actionStatus 111');
                console.log(data, 'data 111');
                console.log(this.sourceLinks, 'this.sourceLinks 111');
                if (!this.sourceLinks.length) {
                    actionStatus?.dec();
                }

                for (const link of this.sourceLinks) {
                    if (link.outputType === output) {
                        return await link.runSync(user, data, status);
                    } else {
                        actionStatus?.dec();
                    }
                }

                return null;
            }

            /**
             * Trigger event
             * @param event
             * @param user
             * @param data
             */
            public triggerEvent<U>(
                event: IPolicyEvent<U>,
                user: PolicyUser,
                data: U,
                actionStatus: any
            ): void {
                console.error('triggerEvent');
            }

            /**
             * Run block action
             * @event PolicyEventType.Run
             * @param {IPolicyEvent} event
             */
            public async runAction(event: IPolicyEvent<any>): Promise<any> {
                if (this.policyInstance.status === PolicyStatus.DISCONTINUED) {
                    return;
                }
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
                this.updateBlock(event.data, event.user, this.tag, event?.user?.userId);
            }

            /**
             * Join GET Data
             * @param {IPolicyDocument | IPolicyDocument[]} data
             * @param {PolicyUser} user
             * @param {AnyBlockType} parent
             */
            public async joinData<U extends IPolicyDocument | IPolicyDocument[]>(
                data: U,
                user: PolicyUser,
                parent: AnyBlockType
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
             * @param userId
             */
            public async updateBlock(state: any, user: PolicyUser, tag: string, userId: string | null) {
                await this.saveState();
                const users: Map<string, PolicyUser> = new Map<string, PolicyUser>();
                if (this.options.followUser) {
                    if (user) {
                        users.set(user.did, user);
                    }
                } else {
                    const allUsers = await this.allAvailableUsers(user, userId);
                    for (const item of allUsers.values()) {
                        users.set(item.did, item);
                    }
                }
                for (const item of users.values()) {
                    PolicyComponentsUtils.BlockUpdateFn(this as any, item);
                }
            }

            /**
             * Update internal block state
             * @param state
             * @return {boolean} - true if state was changed
             */
            public updateDataState(user: PolicyUser, state: any): boolean {
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
            public setPolicyInstance(policyId: string, policy: Policy) {
                this.policyInstance = policy;
                this.policyId = policyId;
                this.messageId = policy?.messageId;
                if (PolicyHelper.isDryRunMode(this.policyInstance)) {
                    this._dryRun = this.policyId;
                } else {
                    this._dryRun = null;
                }
            }

            /**
             * Set topic id
             * @param id
             */
            public setTopicId(id: string): void {
                this.topicId = id;
            }

            /**
             * Set tool id
             * @param id
             */
            public setToolId(id: string): void {
                this.toolId = id;
            }

            /**
             * Is block child active
             * @param child
             * @param user
             */
            public isChildActive(child: AnyBlockType, user: PolicyUser): boolean {
                if (typeof super.isChildActive === 'function') {
                    return super.isChildActive(child, user);
                }
                return true;
            }

            /**
             * Is block active
             * @param user
             */
            public isActive(user: PolicyUser): boolean {
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
                if (this.policyId && stateFields && (Object.keys(stateFields).length > 0)) {
                    await this.databaseServer.saveBlockState(this.policyId, this.uuid, this.tag, stateFields);
                }
            }

            /**
             * Restore block state
             */
            public async restoreState(): Promise<void> {
                const stateEntity = await this.databaseServer.getBlockState(this.policyId, this.uuid, this.tag);

                if (!stateEntity) {
                    if (typeof (this as any).onEmptyBlockState === 'function') {
                        try {
                            (this as any).onEmptyBlockState();
                        } catch (e: any) {
                            this.warn(`onEmptyBlockState error: ${e?.message ?? e}`);
                        }
                    }
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
             * Get all users
             * @param currentUser
             * @param userId
             */
            public async allAvailableUsers(currentUser: PolicyUser, userId: string | null): Promise<Map<string, PolicyUser>> {
                const result: Map<string, PolicyUser> = new Map<string, PolicyUser>();
                if (this.dryRun) {
                    const virtualUser = await PolicyComponentsUtils.GetActiveVirtualUser(this as any);
                    if (virtualUser) {
                        result.set(virtualUser.did, virtualUser);
                    }
                } else {
                    const allUsers = await this.databaseServer.getAllPolicyUsers(this.policyId);
                    for (const group of allUsers) {
                        const user = await PolicyComponentsUtils.GetPolicyUserByGroup(group, this as any, userId);
                        if (this.hasPermission(user)) {
                            result.set(user.did, user);
                        }
                    }
                    if (this.hasPermission(currentUser)) {
                        result.set(currentUser.did, currentUser);
                    }
                    if (
                        this.permissions.includes('OWNER') ||
                        this.permissions.includes('ANY_ROLE')
                    ) {
                        const owners = [this.policyOwner];
                        for (const owner of owners) {
                            if (!result.has(owner)) {
                                const user = await PolicyComponentsUtils.GetPolicyUserByDID(owner, null, this as any, userId);
                                if (user) {
                                    result.set(user.did, user);
                                }
                            }
                        }
                    }
                }
                return result;
            }

            /**
             * Check user permission
             * @param role
             * @param user
             */
            public hasPermission(user: PolicyUser | null): boolean {
                if (user) {
                    if (this.permissions.includes('ANY_ROLE')) {
                        return true;
                    }
                    if (this.permissions.indexOf(user.role) > -1) {
                        return true;
                    }
                    if (this.permissions.includes('NO_ROLE') && !user.role && !user.isAdmin) {
                        return true;
                    }
                    if (this.permissions.includes('OWNER') && user.isAdmin) {
                        return true;
                    }
                }
                return false;
            }

            /**
             * Check Permission and Active
             * @param user
             */
            public async isAvailable(user: PolicyUser): Promise<boolean> {
                if (this.isActive(user) && this.hasPermission(user)) {
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
                this.components.info(message, [
                    'GUARDIAN_SERVICE',
                    this.uuid,
                    this.blockType,
                    this.tag,
                    this.policyId
                ], this.policyInstance.ownerId);
            }

            /**
             * Write error message
             * @param message
             * @protected
             */
            protected error(message: string) {
                this.components.error(message, [
                    'GUARDIAN_SERVICE',
                    this.uuid,
                    this.blockType,
                    this.tag,
                    this.policyId
                ], this.policyInstance.ownerId);
            }

            /**
             * Write warn message
             * @param message
             * @protected
             */
            protected warn(message: string) {
                this.components.warn(message, [
                    'GUARDIAN_SERVICE',
                    this.uuid,
                    this.blockType,
                    this.tag,
                    this.policyId
                ], this.policyInstance.ownerId);
            }

            /**
             * Write debug message
             * @param message
             * @protected
             */
            protected debug(message: any) {
                this.components.debug(message);
            }

            /**
             * Save and update debug context
             * @param context
             * @protected
             */
            protected async debugContext(context: IDebugContext): Promise<IDebugContext> {
                if (this._dryRun) {
                    return await this.components.debugContext(this.tag, context);
                } else {
                    return context;
                }
            }

            /**
             * Save debug error
             * @param context
             * @protected
             */
            protected debugError(error: any): void {
                if (this._dryRun) {
                    this.components.debugError(this.tag, error);
                }
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

            /**
             * Create backup
             * @protected
             */
            protected backup(): void {
                PolicyComponentsUtils.backup(this.policyId);
            }

            /**
             * Get Cache
             * @param {string} name - variable name
             * @param {PolicyUser | string} [user] - user DID
             * @returns {V} - variable value
             * @protected
             */
            protected async getCache<V>(name: string, user?: PolicyUser | string): Promise<V> {
                const did = user ? (typeof user === 'object' ? user.did : user) : 'all';
                const record = await this.databaseServer.getBlockCache(this.policyId, this.uuid, did, name);
                return record ? record.value : null;
            }

            /**
             * Set Cache
             * @param {BlockCacheType} type - variable size
             * @param {string} name - variable name
             * @param {V} value - variable value
             * @param {PolicyUser | string} [user] - user DID
             * @protected
             */
            protected async setCache<V>(
                type: BlockCacheType,
                name: string,
                value: V,
                user?: PolicyUser | string
            ): Promise<void> {
                const did = user ? (typeof user === 'object' ? user.did : user) : 'all';
                await this.databaseServer.saveBlockCache(
                    this.policyId, this.uuid, did, name, value, type === BlockCacheType.Long
                );
            }

            /**
             * Set Cache
             * @param {string} name - variable name
             * @param {V} value - variable value
             * @param {PolicyUser | string} [user] - user DID
             * @protected
             */
            protected async setShortCache<V>(
                name: string,
                value: V,
                user?: PolicyUser | string
            ): Promise<void> {
                const did = user ? (typeof user === 'object' ? user.did : user) : 'all';
                await this.databaseServer.saveBlockCache(
                    this.policyId, this.uuid, did, name, value, false
                );
            }

            /**
             * Set Cache (Big value)
             * @param {string} name - variable name
             * @param {V} value - variable value
             * @param {PolicyUser | string} [user] - user DID
             * @protected
             */
            protected async setLongCache<V>(
                name: string,
                value: V,
                user?: PolicyUser | string
            ): Promise<void> {
                const did = user ? (typeof user === 'object' ? user.did : user) : 'all';
                await this.databaseServer.saveBlockCache(
                    this.policyId, this.uuid, did, name, value, true
                );
            }
        };
    };
}
