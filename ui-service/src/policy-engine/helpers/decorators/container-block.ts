import {BasicBlock} from '@policy-engine/helpers/decorators/basic-block';
import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces/block-options';
import {StateContainer} from '@policy-engine/state-container';
import {IAuthUser} from '../../../auth/auth.interface';
import {getMongoRepository} from 'typeorm';
import {Policy} from '@entity/policy';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';

/**
 * Container block decorator
 * @param options
 */
export function ContainerBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'ContainerBlock';

            async getData(user: IAuthUser | null): Promise<any> {
                let data = {}
                if (super.getData) {
                    data = await super.getData(user);
                }

                const ref = PolicyBlockHelpers.GetBlockRef(this);
                const currentPolicy = await getMongoRepository(Policy).findOne(ref.policyId);
                const currentRole = (typeof currentPolicy.registeredUsers === 'object') ? currentPolicy.registeredUsers[user.did] : null;

                return Object.assign(data, {
                    id: this.uuid,
                    blockType: this.blockType,
                    blocks: this.children.map(child => {
                        if (!StateContainer.IfHasPermission(child.uuid, currentRole, user)) {
                            return undefined;
                        }
                        return {
                            uiMetaData: child.options.uiMetaData,
                            content: child.blockType,
                            blockType: child.blockType,
                            id: child.uuid,
                            isActive: StateContainer.GetBlockState(child.uuid, user).isActive
                        }
                    }),
                    isActive: StateContainer.GetBlockState(this.uuid, user).isActive
                })
            }
        }
    }
}
