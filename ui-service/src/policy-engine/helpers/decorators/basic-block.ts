import {PolicyBlockDefaultOptions} from '@policy-engine/helpers/policy-block-default-options';
import {PolicyBlockDependencies, PolicyBlockMap, PolicyTagMap} from '@policy-engine/interfaces';
import {PolicyBlockDecoratorOptions, PolicyBlockFullArgumentList} from '@policy-engine/interfaces/block-options';
import {UserRole} from 'interfaces';

import {IPolicyBlock, ISerializedBlock,} from '../../policy-engine.interface';
import {StateContainer} from '../../state-container';

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
                protected readonly permissions: UserRole[],
                protected readonly dependencies: PolicyBlockDependencies,
                private readonly blockMap: PolicyBlockMap,
                private readonly tagMap: PolicyTagMap,
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
            StateContainer.BlockComponentStaff(null),
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

            public readonly blockClassName = 'BasicBlock';

            constructor(
                _uuid: string,
                defaultActive: boolean,
                tag: string,
                permissions: UserRole[],
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
                    o.blockMap,
                    o.tagMap,
                    _uuid,
                    _parent || o._parent,
                    _options
                );

                if (this.parent) {
                    this.parent.registerChild(this);
                }

                this.init();
            }

            public registerSubscriptions(): void {
                // if (this.dependencies.length === 0) {
                //     return;
                // }
                //
                // for (let dep of this.dependencies) {
                //     const block = StateContainer.GetBlockByTag(dep);
                //     StateContainer.RegisterStateSubscription(block.uuid, this.updateBlock.bind(this));
                // }
            }

            public setPolicyId(id): void {
                this.policyId = id;
            }

            public setPolicyOwner(did: string) {
                this.policyOwner = did;
            }

            public async updateBlock(state, user, tag) {
                // TransformState(this.options.stateMutation, state, tag, this.uuid);
                //
                if (Array.isArray(this.updateHandlers)) {
                    for (let fn of this.updateHandlers) {
                        await fn.call(this, this.uuid, state, user, tag);
                    }
                }

                StateContainer.UpdateFn(this.uuid, state, user, tag);
            }

            public registerChild(child: IPolicyBlock): void {
                this.children.push(child);
            }

            public hasPermission(role: UserRole): boolean {
                return this.permissions.indexOf(role) > -1;
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

            public getBlockRef(): any {
                return this;
            }

            private init() {

            }

        };
    };
}
