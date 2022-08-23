import { EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';
import { GenerateUUIDv4, GroupAccessType, GroupRelationshipType } from '@guardian/interfaces';
import { BlockActionError } from '@policy-engine/errors';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { PolicyUtils } from '@policy-engine/helpers/utils';

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
     * did
     */
    owner: string,
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
    groupAccessType: GroupAccessType,
    /**
     * User name
     */
    username: string,
    /**
     * Group name
     */
    groupName: string
    /**
     * Is active
     */
    active: boolean
}

interface IGroupConfig {
    /**
     * Group name
     */
    name: string,
    /**
     * Creator (role)
     */
    creator: string,
    /**
     * Members (roles)
     */
    members: string[],
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

    /**
     * Create Policy Invite
     * @param ref
     * @param token
     */
    private async parseInvite(ref: AnyBlockType, token: string): Promise<any> {
        let uuid: string;
        let role: string;
        try {
            const { invitation } = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
            const item = await ref.databaseServer.parseInviteToken(ref.policyId, invitation);
            console.log('3', item, invitation);
            uuid = item?.uuid;
            role = item?.role;
        } catch (error) {
            console.log('1', error);
            ref.error(`Invalid invitation: ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError('Invalid invitation', ref.blockType, ref.uuid);
        }
        if (uuid) {
            return { uuid, role };
        } else {
            console.log('2');
            throw new BlockActionError('Invalid invitation', ref.blockType, ref.uuid);
        }
    }

    private getGroupConfig(ref: AnyBlockType, groupName: string): IGroupConfig {
        const policyGroups: IGroupConfig[] = ref.policyInstance.policyGroups || [];
        const groupConfig = policyGroups.find(e => e.name === groupName);

        if (groupConfig) {
            return groupConfig;
        } else {
            const policyRoles: string[] = ref.policyInstance.policyRoles || [];
            const roleConfig = policyRoles.find(e => e === groupName);
            if (roleConfig) {
                return {
                    name: roleConfig,
                    creator: roleConfig,
                    members: [roleConfig],
                    groupRelationshipType: GroupRelationshipType.Single,
                    groupAccessType: GroupAccessType.Private
                }
            } else {
                throw new Error(`Group "${groupName}" does not exist`);
            }
        }
    }

    private async getGroupByConfig(
        ref: AnyBlockType,
        did: string,
        username: string,
        groupConfig: IGroupConfig
    ): Promise<IUserGroup> {
        if (groupConfig.groupRelationshipType === GroupRelationshipType.Multiple) {
            if (groupConfig.groupAccessType === GroupAccessType.Global) {
                const result = await ref.databaseServer.getGlobalGroup(ref.policyId, groupConfig.name);
                if (result) {
                    return {
                        policyId: ref.policyId,
                        did,
                        username,
                        owner: null,
                        uuid: result.uuid,
                        role: result.role,
                        groupRelationshipType: result.groupRelationshipType,
                        groupAccessType: result.groupAccessType,
                        groupName: result.groupName,
                        active: true
                    }
                } else {
                    return {
                        policyId: ref.policyId,
                        did,
                        username,
                        owner: null,
                        uuid: GenerateUUIDv4(),
                        role: groupConfig.creator,
                        groupName: groupConfig.name,
                        groupRelationshipType: GroupRelationshipType.Multiple,
                        groupAccessType: GroupAccessType.Global,
                        active: true
                    };
                }
            } else {
                return {
                    policyId: ref.policyId,
                    did,
                    username,
                    owner: did,
                    uuid: GenerateUUIDv4(),
                    role: groupConfig.creator,
                    groupName: groupConfig.name,
                    groupRelationshipType: GroupRelationshipType.Multiple,
                    groupAccessType: GroupAccessType.Private,
                    active: true
                }
            }
        } else {
            return {
                policyId: ref.policyId,
                did,
                username,
                owner: did,
                uuid: GenerateUUIDv4(),
                role: groupConfig.creator,
                groupName: groupConfig.name,
                groupRelationshipType: GroupRelationshipType.Single,
                groupAccessType: GroupAccessType.Private,
                active: true
            }
        }
    }

    private async getGroupByToken(
        ref: AnyBlockType,
        did: string,
        username: string,
        uuid: string,
        role: string
    ): Promise<IUserGroup> {
        const result = await ref.databaseServer.getGroupByID(ref.policyId, uuid);
        if (!result) {
            throw new BlockActionError('Invalid token', ref.blockType, ref.uuid);
        }
        const group = {
            policyId: ref.policyId,
            did,
            username,
            owner: result.owner,
            uuid: result.uuid,
            role: role,
            groupRelationshipType: result.groupRelationshipType,
            groupAccessType: result.groupAccessType,
            groupName: result.groupName,
            active: true
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
            groups: Array.isArray(ref.options.groups) ? ref.options.groups : [],
            uiMetaData: ref.options.uiMetaData
        }
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    async setData(user: IPolicyUser, data: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const did = user?.did;
        const curUser = await PolicyUtils.getUser(ref, did);
        const username = curUser?.username;

        if (!did) {
            throw new BlockActionError('Invalid user', ref.blockType, ref.uuid);
        }

        let group: IUserGroup;
        if (data.invitation) {
            const { uuid, role } = await this.parseInvite(ref, data.invitation);
            group = await this.getGroupByToken(ref, did, username, uuid, role);
        } else if (data.group) {
            const groupConfig = this.getGroupConfig(ref, data.group);
            group = await this.getGroupByConfig(ref, did, username, groupConfig);
        } else if (data.role) {
            const groupConfig = this.getGroupConfig(ref, data.role);
            group = await this.getGroupByConfig(ref, did, username, groupConfig);
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
