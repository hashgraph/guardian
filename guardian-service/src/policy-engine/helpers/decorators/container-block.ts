import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { PolicyComponentsUtils } from '../../policy-components-utils';
import { IAuthUser } from '@guardian/common';
import { IPolicyBlock, IPolicyContainerBlock } from '@policy-engine/policy-engine.interface';

/**
 * Container block decorator
 * @param options
 */
export function ContainerBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'ContainerBlock';

            /**
             * Change block step
             * @param user
             * @param data
             * @param target
             */
            async changeStep(user: IAuthUser, data: any, target: IPolicyBlock) {
                let result: any;
                if (typeof super.changeStep === 'function') {
                    result = super.changeStep(user, data, target);
                }
                return result;
            }

            /**
             * Get block data
             * @param user
             */
            async getData(user: IAuthUser | null): Promise<any> {
                let data = {}
                if (super.getData) {
                    data = await super.getData(user);
                }

                const ref = PolicyComponentsUtils.GetBlockRef<IPolicyContainerBlock>(this);
                const currentRole = await PolicyComponentsUtils.GetUserRole(ref.policyId, user);
                const children = ref.children.map(child => {
                    if (child.defaultActive && PolicyComponentsUtils.CheckPermission(child, user, currentRole)) {
                        return {
                            uiMetaData: child.options.uiMetaData,
                            content: child.blockType,
                            blockType: child.blockType,
                            id: child.uuid,
                        }
                    } else {
                        return undefined;
                    }
                });

                const result = Object.assign(data, {
                    id: ref.uuid,
                    blockType: ref.blockType,
                    blocks: children
                })

                ref.updateDataState(user, result);
                return result;
            }

            /**
             * Is last child
             * @param target
             */
            isLast(target: IPolicyBlock): boolean {
                const ref = PolicyComponentsUtils.GetBlockRef(this);
                const index = ref.children.findIndex(c => c.uuid === target.uuid);
                return index === (ref.children.length - 1);
            }

            /**
             * Is cyclic
             */
            isCyclic(): boolean {
                if (typeof super.isCyclic === 'function') {
                    return super.isCyclic();
                }
                return false;
            }

            /**
             * Get last child
             */
            getLast(): IPolicyBlock {
                const ref = PolicyComponentsUtils.GetBlockRef(this);
                return ref.children[0];
            }

            /**
             * Get first child
             */
            getFirst(): IPolicyBlock {
                const ref = PolicyComponentsUtils.GetBlockRef(this);
                return ref.children[ref.children.length - 1];
            }
        }
    }
}
