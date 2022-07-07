import { EventBlock } from '@policy-engine/helpers/decorators';
import { IAuthUser } from '@auth/auth.interface';
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { UserRole } from '@guardian/interfaces';

@EventBlock({
    blockType: 'policyRolesBlock',
    commonBlock: false,
    about: {
        label: 'Roles',
        title: `Add 'Choice Of Roles' Block`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.RefreshEvent,
        ],
        output: null,
        defaultEvent: false
    }
})
export class PolicyRolesBlock {
    async getData(user: IAuthUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        return {
            roles: Array.isArray(ref.options.roles) ? ref.options.roles : [],
            uiMetaData: ref.options.uiMetaData
        }
    }

    async setData(user: IAuthUser, document: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const { username, role, did } = user;
        const result = await PolicyComponentsUtils.SetUserRole(ref.policyId, user, document.role);

        await Promise.all([
            PolicyComponentsUtils.BlockUpdateFn(ref.parent.uuid, {}, { username, role, did }, ref.tag),
            PolicyComponentsUtils.UpdateUserInfoFn({ username, role, did }, result)
        ]);

        return result;
    }
}
