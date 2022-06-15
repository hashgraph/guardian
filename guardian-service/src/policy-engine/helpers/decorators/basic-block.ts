import { PolicyBlockDefaultOptions } from '@policy-engine/helpers/policy-block-default-options';
import { EventConfig, PolicyBlockMap, PolicyTagMap } from '@policy-engine/interfaces';
import { PolicyBlockDecoratorOptions, PolicyBlockFullArgumentList } from '@policy-engine/interfaces/block-options';
import { ExternalMessageEvents, PolicyRole } from '@guardian/interfaces';
import { AnyBlockType, IPolicyBlock, ISerializedBlock, } from '../../policy-engine.interface';
import { PolicyComponentsUtils } from '../../policy-components-utils';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { IAuthUser } from '@auth/auth.interface';
import { getMongoRepository } from 'typeorm';
import { BlockState } from '@entity/block-state';
import deepEqual from 'deep-equal';
import { BlockActionError } from '@policy-engine/errors';
import { Policy } from '@entity/policy';
import { IPolicyEvent, PolicyLink } from '@policy-engine/interfaces/policy-event';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces/policy-event-type';
import { ExternalEventChannel, Logger } from '@guardian/common';

/**
 * Basic block decorator
 * @param options
 */
export function BasicBlock<T>(options: Partial<PolicyBlockDecoratorOptions>) {
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

            private _children: IPolicyBlock[] = [];

            public get children(): IPolicyBlock[] {
                return this._children
            }

            public get uuid(): string {
                return this._uuid
            }

            public get options(): any {
                return this._options;
            }

            public get parent(): IPolicyBlock {
                return this._parent
            }

            public rules() {

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
            static blockType = o.blockType;
            static about = o.about;
            static publishExternalEvent = o.publishExternalEvent;

            protected oldDataState: any = {};
            protected currentDataState: any = {};
            protected logger: Logger;

            public policyId: string;
            public policyOwner: string;
            public policyInstance: any;
            public topicId: string;

            public sourceLinks: PolicyLink<any>[];
            public targetLinks: PolicyLink<any>[];

            public actions: any[];

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

            public get next(): IPolicyBlock {
                if (this.parent) {
                    return this.parent.getNextChild(this.uuid);
                }
                return undefined;
            }

            public get events(): EventConfig[] {
                return this.options.events || [];
            }

            public async beforeInit(): Promise<void> {
                if (typeof super.beforeInit === 'function') {
                    super.beforeInit();
                }
            }

            public async afterInit(): Promise<void> {
                await this.restoreState();

                if (typeof super.afterInit === 'function') {
                    super.afterInit();
                }
            }

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

            public getNextChild(uuid: string): IPolicyBlock {
                if (typeof super.getNextChild === 'function') {
                    return super.getNextChild(uuid);
                }
                const index = this.getChildIndex(uuid);
                if (index !== -1) {
                    return this.children[index + 1];
                }
            }

            public addSourceLink(link: PolicyLink<any>): void {
                this.sourceLinks.push(link)
            }

            public addTargetLink(link: PolicyLink<any>): void {
                this.targetLinks.push(link)
            }

            public triggerEvents(output: PolicyOutputEventType, user?: IAuthUser, data?: any): void {
                for (let link of this.sourceLinks) {
                    if (link.outputType == output) {
                        link.run(user, data);
                    }
                }
            }

            public triggerEvent(event: any, user?: IAuthUser, data?: any): void {
                console.error('triggerEvent');
            }

            /**
             * @event PolicyEventType.Run
             * @param {IPolicyEvent} event
             */
            public async runAction(event: IPolicyEvent<any>): Promise<any> {
                const parent = this.parent as any;
                if (parent && (typeof parent['changeStep'] === 'function')) {
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
                            result: result
                        }
                    )
                }
                return result;
            }

            /**
             * @event PolicyEventType.DependencyEvent
             * @param {IPolicyEvent} event
             */
            public async refreshAction(event: IPolicyEvent<any>): Promise<any> {
                if (typeof super.refreshAction === 'function') {
                    return await super.refreshAction(event);
                }
                this.updateBlock(event.data, event.user, '');
            }

            public async updateBlock(state: any, user: IAuthUser, tag: string) {
                await this.saveState();
                if (!this.options.followUser) {
                    const policy = await getMongoRepository(Policy).findOne(this.policyId);

                    for (let [did, role] of Object.entries(policy.registeredUsers)) {
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

            public setPolicyId(id: string): void {
                this.policyId = id;
            }

            public setPolicyOwner(did: string) {
                this.policyOwner = did;
            }
            public setPolicyInstance(policy: any) {
                this.policyInstance = policy;
            }

            public setTopicId(id: string): void {
                this.topicId = id;
            }

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
                    for (let child of this.children) {
                        await child.validate(resultsContainer);
                    }
                }
                return;
            }

            public isChildActive(child: AnyBlockType, user: IAuthUser): boolean {
                if (typeof super.isChildActive === 'function') {
                    return super.isChildActive(child, user);
                }
                return true;
            }

            isActive(user: IAuthUser): boolean {
                if (!this.parent) {
                    return true;
                }
                return this.parent.isChildActive(this as any, user);
            }

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

            public async restoreState(): Promise<void> {
                const stateEntity = await getMongoRepository(BlockState).findOne({
                    policyId: this.policyId,
                    blockId: this.uuid
                });

                if (!stateEntity) {
                    return;
                }


                for (let [key, value] of Object.entries(JSON.parse(stateEntity.blockState))) {
                    this[key] = value;
                }
            }

            public registerChild(child: IPolicyBlock): void {
                this.children.push(child);
            }

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
                    for (let child of (this as any).children) {
                        obj.children.push(child.serialize(withUUID));
                    }
                }

                return obj;
            }

            public destroy() {
                if (typeof super.destroy === 'function') {
                    super.destroy();
                }

                for (let child of (this as any).children) {
                    child.destroy();
                }
            }


            protected log(message: string) {
                this.logger.info(message, ['GUARDIAN_SERVICE', this.uuid, this.blockType, this.tag, this.policyId]);
            }

            protected error(message: string) {
                this.logger.error(message, ['GUARDIAN_SERVICE', this.uuid, this.blockType, this.tag, this.policyId]);
            }

            protected warn(message: string) {
                this.logger.warn(message, ['GUARDIAN_SERVICE', this.uuid, this.blockType, this.tag, this.policyId]);
            }
        };
    };
}
