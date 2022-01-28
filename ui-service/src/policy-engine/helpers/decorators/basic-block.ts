import {PolicyBlockDefaultOptions} from '@policy-engine/helpers/policy-block-default-options';
import {PolicyBlockDependencies, PolicyBlockMap, PolicyTagMap} from '@policy-engine/interfaces';
import {PolicyBlockDecoratorOptions, PolicyBlockFullArgumentList} from '@policy-engine/interfaces/block-options';
import {PolicyRole} from 'interfaces';

import {AnyBlockType, IPolicyBlock, ISerializedBlock,} from '../../policy-engine.interface';
import {PolicyComponentsStuff} from '../../policy-components-stuff';
import {PolicyValidationResultsContainer} from '@policy-engine/policy-validation-results-container';
import {IAuthUser} from '../../../auth/auth.interface';
import {getMongoRepository} from 'typeorm';
import {BlockState} from '@entity/block-state';

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
                protected readonly dependencies: PolicyBlockDependencies,
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

        const o: PolicyBlockFullArgumentList = <PolicyBlockFullArgumentList>Object.assign(
            options,
            PolicyBlockDefaultOptions(),
            {
                defaultActive: false,
                permissions: [],
                dependencies: []
            }
        );

        return class extends basicClass {
            static blockType = o.blockType;

            public policyId: string;
            public policyOwner: string;

            public readonly blockClassName = 'BasicBlock';

            constructor(
                _uuid: string,
                defaultActive: boolean,
                tag: string,
                permissions: PolicyRole[],
                dependencies: PolicyBlockDependencies,
                _parent: IPolicyBlock,
                _options: any
            ) {
                super(
                    o.blockType,
                    o.commonBlock,
                    tag || o.tag,
                    defaultActive || o.defaultActive,
                    permissions || o.permissions,
                    dependencies || o.dependencies,
                    _uuid,
                    _parent || o._parent,
                    _options
                );

                if (this.parent) {
                    this.parent.registerChild(this as any as IPolicyBlock);
                }

                this.init();
            }

            public setPolicyId(id): void {
                this.policyId = id;
            }

            public setPolicyOwner(did: string) {
                this.policyOwner = did;
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

            public async runNext(user: IAuthUser, data: any): Promise<void> {
                if (this.options.stopPropagation) {
                    return;
                }
                if (this.parent && (typeof this.parent['changeStep'] === 'function')) {
                    await this.parent.changeStep(user, data, this.parent.children[this.parent.children.indexOf(this) + 1]);
                }
            }

            public async runTarget(user: IAuthUser, data: any, target: IPolicyBlock): Promise<void> {
                if (target.parent && (typeof target.parent['changeStep'] === 'function')) {
                    await target.parent.changeStep(user, data, target);
                }
            }

            public async runAction(...args): Promise<any> {
                if (typeof super.runAction === 'function') {
                    return await super.runAction(...args);
                }
            }

            public async updateBlock(state, user, tag) {
                if (!!this.tag) {
                    PolicyComponentsStuff.CallDependencyCallbacks(this.tag, this.policyId, user);
                }
                await this.saveState();
                PolicyComponentsStuff.UpdateFn(this.uuid, state, user, tag);
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
                return this.parent.isChildActive(this, user);
            }

            private async saveState(): Promise<void> {
                const stateFields = PolicyComponentsStuff.GetStateFields(this);
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
                if(this.permissions.includes('ANY_ROLE')) {
                    hasAccess = true;
                }
                if(this.permissions.includes('OWNER')) {
                    if (user) {
                        return user.did === this.policyOwner;
                    }
                }

                if(this.permissions.indexOf(role) > -1) {
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
                if (this.dependencies && (this.dependencies.length > 0)) {
                    obj.dependencies = this.dependencies;
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
                for (let child of (this as any).children) {
                    child.destroy();
                }
            }

            private init() {
                if (typeof super.init === 'function') {
                    super.init();
                }
            }

        };
    };
}
