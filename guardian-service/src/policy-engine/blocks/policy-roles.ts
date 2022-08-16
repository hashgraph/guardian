import { EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';
import { GenerateUUIDv4, GroupAccessType, GroupRelationshipType } from '@guardian/interfaces';
import { BlockActionError } from '@policy-engine/errors';

interface IUserGroup {
    /**
     * policyId
     */
    policyId: string,
    /**
     * did
     */
    did: string,
    /**
     * uuid
     */
    uuid: string,
    /**
     * role
     */
    role: string,
    /**
     * groupRelationshipType
     */
    groupRelationshipType: GroupRelationshipType,
    /**
     * groupAccessType
     */
    groupAccessType: GroupAccessType
}

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

    private getGroupByName(policyId: string, did: string, name: string): IUserGroup {
        const group = {
            policyId,
            did,
            uuid: GenerateUUIDv4(),
            role: name,
            groupRelationshipType: GroupRelationshipType.Single,
            groupAccessType: GroupAccessType.Private
        }
        return group;
    }

    private getGroupByToken(policyId: string, did: string, token: string): IUserGroup {
        const group = {
            policyId,
            did,
            uuid: '',
            role: '',
            groupRelationshipType: GroupRelationshipType.Single,
            groupAccessType: GroupAccessType.Private
        }
        return group;
    }

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
    async setData(user: IPolicyUser, data: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const did = user?.did;

        if (!did) {
            throw new BlockActionError('Invalid user', ref.blockType, ref.uuid);
        }

        let group: IUserGroup;
        if (data.invitation) {
            group = this.getGroupByToken(ref.policyId, did, data.invitation);
        } else if (data.role) {
            group = this.getGroupByName(ref.policyId, did, data.role);
        } else {
            throw new BlockActionError('Invalid role', ref.blockType, ref.uuid);
        }

        const result = await ref.databaseServer.setUserInGroup(group);

        await Promise.all([
            PolicyComponentsUtils.BlockUpdateFn(ref.parent.uuid, {}, user, ref.tag),
            PolicyComponentsUtils.UpdateUserInfoFn(user, ref.policyInstance)
        ]);
        return true;
    }
}
