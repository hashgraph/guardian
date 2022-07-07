import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { PolicyComponentsUtils } from '../../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { IPolicyBlock, IPolicyContainerBlock } from '@policy-engine/policy-engine.interface';

/**
 * Container block decorator
 * @param options
 */
export function ContainerBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'ContainerBlock';

            async changeStep(user: IAuthUser, data: any, target: IPolicyBlock) {
                let result: any;
                if (typeof super.changeStep === 'function') {
                    result = super.changeStep(user, data, target);
                }
                return result;
            }

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

                const changed = ref.updateDataState(user, result);
                return result;
            }

            isLast(target: IPolicyBlock): boolean {
                const ref = PolicyComponentsUtils.GetBlockRef(this);
                const index = ref.children.findIndex(c => c.uuid == target.uuid);
                return index == (ref.children.length - 1);
            }

            isCyclic(): boolean {
                if (typeof super.isCyclic === 'function') {
                    return super.isCyclic();
                }
                return false;
            }

            getLast(): IPolicyBlock {
                const ref = PolicyComponentsUtils.GetBlockRef(this);
                return ref.children[0];
            }

            getFirst(): IPolicyBlock {
                const ref = PolicyComponentsUtils.GetBlockRef(this);
                return ref.children[ref.children.length - 1];
            }
        }
    }
}
