import { EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';

/**
 * Policy roles block
 */
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
    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        return {
            roles: Array.isArray(ref.options.roles) ? ref.options.roles : [],
            uiMetaData: ref.options.uiMetaData
        }
    }

    /**
     * Set block data
     * @param user
     * @param document
     */
    async setData(user: IPolicyUser, document: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const result = await ref.databaseServer.setUserRole(ref.policyId, user?.did, document.role);
        await Promise.all([
            PolicyComponentsUtils.BlockUpdateFn(ref.parent.uuid, {}, user, ref.tag),
            PolicyComponentsUtils.UpdateUserInfoFn(user, ref.policyInstance)
        ]);
        return result;
    }
}
