import {BasicBlock} from '@policy-engine/helpers/decorators/basic-block';
import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces/block-options';
import {StateContainer} from '@policy-engine/state-container';
import {IAuthUser} from '../../../auth/auth.interface';
import {getMongoRepository} from 'typeorm';
import {Policy} from '@entity/policy';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {User} from '@entity/user';

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
                if (typeof super.changeStep === 'function') {
                    const result = super.changeStep(user, data, target);
                    if (target) {
                        await target.runAction(data, user)
                    }
                    return result;
                }
            }

            async getData(user: IAuthUser | null): Promise<any> {
                let data = {}
                if (super.getData) {
                    data = await super.getData(user);
                }

                const ref = PolicyBlockHelpers.GetBlockRef(this);
                const currentPolicy = await getMongoRepository(Policy).findOne(ref.policyId);
                const currentRole = (typeof currentPolicy.registeredUsers === 'object') ? currentPolicy.registeredUsers[user.did] : null;
                const dbUser = await getMongoRepository(User).findOne({username: user.username});

                return Object.assign(data, {
                    id: this.uuid,
                    blockType: this.blockType,
                    blocks: this.children.map(child => {
                        let returnValue = {
                            uiMetaData: child.options.uiMetaData,
                            content: child.blockType,
                            blockType: child.blockType,
                            id: child.uuid,
                            isActive: true
                        };

                        if (!child.defaultActive) {
                            return undefined;
                        }

                        if (child.permissions.includes('ANY_ROLE')) {
                            return returnValue;
                        }

                        if(currentRole) {
                            if (StateContainer.IfHasPermission(child.uuid, currentRole, dbUser)) {
                                return returnValue;
                            }
                        } else {
                            if(currentPolicy.owner === dbUser.did) {
                                if (child.permissions.includes('OWNER')) {
                                    return returnValue;
                                }
                            } else {
                                if (child.permissions.includes('NO_ROLE')) {
                                    return returnValue;
                                }
                            }
                        }

                        return undefined;
                    }),
                    isActive: StateContainer.GetBlockState(this.uuid, user).isActive
                })
            }
        }
    }
}
