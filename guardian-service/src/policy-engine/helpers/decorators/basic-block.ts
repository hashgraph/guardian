import { PolicyBlockDefaultOptions } from '@policy-engine/helpers/policy-block-default-options';
import { EventConfig } from '@policy-engine/interfaces';
import { PolicyBlockDecoratorOptions, PolicyBlockFullArgumentList } from '@policy-engine/interfaces/block-options';
import { ExternalMessageEvents, PolicyRole } from '@guardian/interfaces';
import { AnyBlockType, IPolicyBlock, ISerializedBlock, } from '../../policy-engine.interface';
import { PolicyComponentsUtils } from '../../policy-components-utils';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { getMongoRepository } from 'typeorm';
import { BlockState } from '@entity/block-state';
import deepEqual from 'deep-equal';
import { Policy } from '@entity/policy';
import { IPolicyEvent, PolicyLink } from '@policy-engine/interfaces/policy-event';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces/policy-event-type';
import { IAuthUser, ExternalEventChannel, Logger } from '@guardian/common';

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

        const o = Object.assign(
            options,
            PolicyBlockDefaultOptions(),
            {
                defaultActive: false,
                permissions: []
            }
        ) as PolicyBlockFullArgumentList;

        return class extends basicClass {
            /**
             * Block type
             */
            static blockType = o.blockType;
            /**
             * Block about
             */
            static about = o.about;
            /**
             * Publish external event
             */
            static publishExternalEvent = o.publishExternalEvent;

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
             * Block class name
             */
            public readonly blockClassName = 'BasicBlock';

            constructor(
                _uuid: string,
                defaultActive: boolean,
                tag: string,
                permissions: PolicyRole[],
                _parent: IPolicyBlock,
                _options: any
            ) {
                super(
                    o.blockType,
                    o.commonBlock,
                    tag || o.tag,
                    defaultActive || o.defaultActive,
                    permissions || o.permissions,
                    _uuid,
                    _parent || o._parent,
                    _options
                );
                this.logger = new Logger();

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
             * Block events getter
             */
            public get events(): EventConfig[] {
                return this.options.events || [];
            }

            /**
             * Before init callback
             */
            public async beforeInit(): Promise<void> {
                if (typeof super.beforeInit === 'function') {
                    super.beforeInit();
                }
            }

            /**
             * After init callback
             */
            public async afterInit(): Promise<void> {
                await this.restoreState();

                if (typeof super.afterInit === 'function') {
                    super.afterInit();
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
            public triggerEvents(output: PolicyOutputEventType, user?: IAuthUser, data?: any): void {
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
            public triggerEvent(event: any, user?: IAuthUser, data?: any): void {
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
                if (this.publishExternalEvent) {
                    new ExternalEventChannel().publishMessage(
                        ExternalMessageEvents.BLOCK_RUN_EVENTS,
                        {
                            uuid: this.uuid,
                            blockType: this.blockType,
                            blockTag: this.tag,
                            data: event.data,
                            result
                        }
                    )
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
                this.updateBlock(event.data, event.user, '');
            }

            /**
             * Update block
             * @param state
             * @param user
             * @param tag
             */
            public async updateBlock(state: any, user: IAuthUser, tag: string) {
                await this.saveState();
                if (!this.options.followUser) {
                    const policy = await getMongoRepository(Policy).findOne(this.policyId);

                    for (const [did, role] of Object.entries(policy.registeredUsers)) {
                        if (this.permissions.includes(role)) {
                            PolicyComponentsUtils.BlockUpdateFn(this.uuid, state, { did } as any, tag);
                        } else if (this.permissions.includes('ANY_ROLE')) {
                            PolicyComponentsUtils.BlockUpdateFn(this.uuid, state, { did } as any, tag);
                        }
                    }

                    if (this.permissions.includes('OWNER')) {
                        PolicyComponentsUtils.BlockUpdateFn(this.uuid, state, { did: this.policyOwner } as any, tag);
                    }
                } else {
                    PolicyComponentsUtils.BlockUpdateFn(this.uuid, state, user, tag);
                }
            }

            /**
             * Update internal block state
             * @param state
             * @return {boolean} - true if state was changed
             */
            public updateDataState(user, state: any): boolean {

                this.oldDataState[user.did] = this.currentDataState[user.did];
                this.currentDataState[user.did] = { state };
                return !deepEqual(this.currentDataState[user.did], this.oldDataState[user.did], {
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
                return !deepEqual(this.currentDataState[user.did], this.oldDataState[user.did], {
                    strict: true
                })
            }

            /**
             * Set policy id
             * @param id
             */
            public setPolicyId(id: string): void {
                this.policyId = id;
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
             * @param policy
             */
            public setPolicyInstance(policy: any) {
                this.policyInstance = policy;
            }

            /**
             * Set topic id
             * @param id
             */
            public setTopicId(id: string): void {
                this.topicId = id;
            }

            /**
             * Validate block options
             * @param resultsContainer
             */
            public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
                resultsContainer.registerBlock(this as any as IPolicyBlock);
                if (resultsContainer.countTags(this.tag) > 1) {
                    resultsContainer.addBlockError(this.uuid, `Tag ${this.tag} already exist`);
                }
                const permission = resultsContainer.permissionsNotExist(this.permissions);
                if (permission) {
                    resultsContainer.addBlockError(this.uuid, `Permission ${permission} not exist`);
                }
                if (typeof super.validate === 'function') {
                    await super.validate(resultsContainer)
                }
                if (Array.isArray(this.children)) {
                    for (const child of this.children) {
                        await child.validate(resultsContainer);
                    }
                }
                return;
            }

            /**
             * Is block child active
             * @param child
             * @param user
             */
            public isChildActive(child: AnyBlockType, user: IAuthUser): boolean {
                if (typeof super.isChildActive === 'function') {
                    return super.isChildActive(child, user);
                }
                return true;
            }

            /**
             * Is block active
             * @param user
             */
            isActive(user: IAuthUser): boolean {
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
                    const repo = getMongoRepository(BlockState);
                    let stateEntity = await repo.findOne({
                        policyId: this.policyId,
                        blockId: this.uuid
                    });
                    if (!stateEntity) {
                        stateEntity = repo.create({
                            policyId: this.policyId,
                            blockId: this.uuid,
                        })
                    }

                    stateEntity.blockState = JSON.stringify(stateFields);

                    await repo.save(stateEntity)

                }
            }

            /**
             * Restore block state
             */
            public async restoreState(): Promise<void> {
                const stateEntity = await getMongoRepository(BlockState).findOne({
                    policyId: this.policyId,
                    blockId: this.uuid
                });

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
            public hasPermission(role: PolicyRole | null, user: IAuthUser | null): boolean {
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
                    if (user) {
                        return user.did === this.policyOwner;
                    }
                }

                if (this.permissions.indexOf(role) > -1) {
                    hasAccess = true;
                }
                return hasAccess;
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
        };
    };
}
