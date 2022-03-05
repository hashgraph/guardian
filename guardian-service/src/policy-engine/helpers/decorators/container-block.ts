import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { PolicyComponentsUtils } from '../../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { IPolicyContainerBlock } from '@policy-engine/policy-engine.interface';

/**
 * Container block decorator
 * @param options
 */
export function ContainerBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'ContainerBlock';

            async changeStep(user, data, target) {
                let result: any;
                if (typeof super.changeStep === 'function') {
                    result = super.changeStep(user, data, target);
                }
                if (target) {
                    await target.runAction(data, user)
                }
                return result;
            }

            async getData(user: IAuthUser | null): Promise<any> {
                let data = {}
                if (super.getData) {
                    data = await super.getData(user);
                }

                const ref = PolicyComponentsUtils.GetBlockRef<IPolicyContainerBlock>(this);
                const currentPolicy = await getMongoRepository(Policy).findOne(ref.policyId);
                const currentRole = (typeof currentPolicy.registeredUsers === 'object') ? currentPolicy.registeredUsers[user.did] : null;
                // const dbUser = await getMongoRepository(User).findOne({ username: user.username });

                const result = Object.assign(data, {
                    id: this.uuid,
                    blockType: this.blockType,
                    blocks: this.children.map(child => {
                        let returnValue = {
                            uiMetaData: child.options.uiMetaData,
                            content: child.blockType,
                            blockType: child.blockType,
                            id: child.uuid,
                        };

                        if (!child.isActive(user) || !child.defaultActive) {
                            return undefined;
                        }

                        if (PolicyComponentsUtils.IfHasPermission(child.uuid, currentRole, user)) {
                            return returnValue;
                        }

                        return undefined;
                    })
                })

                const changed = (this as any).updateDataState(user, result);
                return result;
            }
        }
    }
}
