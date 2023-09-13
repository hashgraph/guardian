import { ActionCallback, EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { IPolicyUser, PolicyUser } from '@policy-engine/policy-user';
import { GenerateUUIDv4, GroupAccessType, GroupRelationshipType, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { BlockActionError } from '@policy-engine/errors';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { DataTypes, PolicyUtils } from '@policy-engine/helpers/utils';
import { VcHelper, MessageAction, MessageServer, RoleMessage, IAuthUser } from '@guardian/common';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

/**
 * User Group
 */
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
    groupName: string,
    /**
     * Group Label
     */
    groupLabel: string,
    /**
     * Is active
     */
    active: boolean,
    /**
     * Message Id
     */
    messageId?: string

    /**
     * User id
     */
    userId?: string
}

/**
 * User Group Config
 */
interface IGroupConfig {
    /**
     * Group name
     */
    name: string,
    /**
     * Group name
     */
    label: string,
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
        output: [
            PolicyOutputEventType.CreateGroup,
            PolicyOutputEventType.JoinGroup
        ],
        defaultEvent: false
    },
    variables: [
        { path: 'options.roles', alias: 'roles', type: 'Role' },
        { path: 'options.groups', alias: 'groups', type: 'Group' }
    ]
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
            uuid = item?.uuid;
            role = item?.role;
        } catch (error) {
            ref.error(`Invalid invitation: ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError('Invalid invitation', ref.blockType, ref.uuid);
        }
        if (uuid) {
            return { uuid, role };
        } else {
            throw new BlockActionError('Invalid invitation', ref.blockType, ref.uuid);
        }
    }

    /**
     * Find Group Config
     * @param ref
     * @param groupName
     * @param groupLabel
     */
    private getGroupConfig(ref: AnyBlockType, groupName: string, groupLabel: string): IGroupConfig {
        const groupConfig = PolicyUtils.getGroupTemplate<IGroupConfig>(ref, groupName);

        if (groupConfig) {
            const label = groupConfig.groupAccessType === GroupAccessType.Global ? groupConfig.name : groupLabel;
            return { ...groupConfig, label };
        } else {
            const roleConfig = PolicyUtils.getRoleTemplate<string>(ref, groupName);
            if (roleConfig) {
                return {
                    name: roleConfig,
                    label: groupLabel,
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

    /**
     * Create Group by Config
     * @param ref
     * @param did
     * @param username
     * @param groupConfig
     */
    private async getGroupByConfig(
        ref: AnyBlockType,
        user: IAuthUser,
        groupConfig: IGroupConfig
    ): Promise<IUserGroup> {
        if (groupConfig.groupRelationshipType === GroupRelationshipType.Multiple) {
            if (groupConfig.groupAccessType === GroupAccessType.Global) {
                const result = await ref.databaseServer.getGlobalGroup(ref.policyId, groupConfig.name);
                if (result) {
                    return {
                        policyId: ref.policyId,
                        userId: user.id,
                        did: user.did,
                        username: user.username,
                        owner: ref.policyOwner,
                        uuid: result.uuid,
                        role: result.role,
                        groupRelationshipType: result.groupRelationshipType,
                        groupAccessType: result.groupAccessType,
                        groupName: result.groupName,
                        groupLabel: result.groupLabel,
                        active: true
                    }
                } else {
                    return {
                        policyId: ref.policyId,
                        userId: user.id,
                        did: user.did,
                        username: user.username,
                        owner: ref.policyOwner,
                        uuid: GenerateUUIDv4(),
                        role: groupConfig.creator,
                        groupName: groupConfig.name,
                        groupLabel: groupConfig.label,
                        groupRelationshipType: GroupRelationshipType.Multiple,
                        groupAccessType: GroupAccessType.Global,
                        active: true
                    };
                }
            } else {
                return {
                    policyId: ref.policyId,
                    userId: user.id,
                    did: user.did,
                    username: user.username,
                    owner: user.did,
                    uuid: GenerateUUIDv4(),
                    role: groupConfig.creator,
                    groupName: groupConfig.name,
                    groupLabel: groupConfig.label,
                    groupRelationshipType: GroupRelationshipType.Multiple,
                    groupAccessType: GroupAccessType.Private,
                    active: true
                }
            }
        } else {
            return {
                policyId: ref.policyId,
                userId: user.id,
                did: user.did,
                username: user.username,
                owner: user.did,
                uuid: GenerateUUIDv4(),
                role: groupConfig.creator,
                groupName: groupConfig.name,
                groupLabel: groupConfig.label,
                groupRelationshipType: GroupRelationshipType.Single,
                groupAccessType: GroupAccessType.Private,
                active: true
            }
        }
    }

    /**
     * Create Group by invitation
     * @param ref
     * @param did
     * @param username
     * @param uuid
     * @param role
     */
    private async getGroupByToken(
        ref: AnyBlockType,
        user: IAuthUser,
        uuid: string,
        role: string
    ): Promise<IUserGroup> {
        const result = await ref.databaseServer.getGroupByID(ref.policyId, uuid);
        if (!result) {
            throw new BlockActionError('Invalid token', ref.blockType, ref.uuid);
        }

        const member = await ref.databaseServer.getUserInGroup(ref.policyId, user.did, uuid);
        if (member) {
            throw new BlockActionError('You are already a member of this group.', ref.blockType, ref.uuid);
        }

        const group = {
            policyId: ref.policyId,
            did: user.did,
            username: user.username,
            userId: user.id,
            owner: result.owner,
            uuid: result.uuid,
            role,
            groupRelationshipType: result.groupRelationshipType,
            groupAccessType: result.groupAccessType,
            groupName: result.groupName,
            groupLabel: result.groupLabel,
            active: true
        }
        return group;
    }

    /**
     * Create group VC
     * @param ref
     * @param user
     * @param group
     * @private
     */
    private async createVC(ref: AnyBlockType, user: IPolicyUser, group: IUserGroup): Promise<string> {
        const policySchema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.USER_ROLE);
        if (!policySchema) {
            return null;
        }

        const groupOwner = await PolicyUtils.getHederaAccount(ref, group.owner);
        const vcHelper = new VcHelper();
        const vcSubject: any = {
            ...SchemaHelper.getContext(policySchema),
            id: GenerateUUIDv4(),
            role: group.role,
            userId: group.did,
            policyId: ref.policyId
        }
        if (group.uuid) {
            vcSubject.groupOwner = group.uuid;
        }
        if (group.owner) {
            vcSubject.groupOwner = group.owner;
        }
        if (group.groupName) {
            vcSubject.groupName = group.groupName;
        }
        if (group.groupLabel) {
            vcSubject.groupLabel = group.groupLabel;
        }

        const mintVC = await vcHelper.createVC(groupOwner.did, groupOwner.hederaAccountKey, vcSubject);

        const rootTopic = await PolicyUtils.getInstancePolicyTopic(ref);
        const messageServer = new MessageServer(groupOwner.hederaAccountId, groupOwner.hederaAccountKey, ref.dryRun);
        const vcMessage = new RoleMessage(MessageAction.CreateVC);
        vcMessage.setDocument(mintVC);
        vcMessage.setRole(group);
        const vcMessageResult = await messageServer
            .setTopicObject(rootTopic)
            .sendMessage(vcMessage);

        const vcDocument = PolicyUtils.createVC(ref, user, mintVC);
        vcDocument.type = DataTypes.USER_ROLE;
        vcDocument.schema = `#${mintVC.getSubjectType()}`;
        vcDocument.messageId = vcMessageResult.getId();
        vcDocument.topicId = vcMessageResult.getTopicId();
        vcDocument.relationships = null;
        await ref.databaseServer.saveVC(vcDocument);
        return vcMessageResult.getId();
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const roles: string[] = Array.isArray(ref.options.roles) ? ref.options.roles : [];
        const groups: string[] = Array.isArray(ref.options.groups) ? ref.options.groups : [];
        const policyGroups = PolicyUtils.getGroupTemplates<IGroupConfig>(ref);
        const groupMap = {};
        for (const item of policyGroups) {
            if (groups.indexOf(item.name) > -1) {
                groupMap[item.name] = {
                    groupAccessType: item.groupAccessType,
                    groupRelationshipType: item.groupRelationshipType
                };
            }
        }
        return {
            roles,
            groups,
            groupMap,
            isMultipleGroups: policyGroups.length > 0,
            uiMetaData: ref.options.uiMetaData
        }
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    @ActionCallback({
        output: [PolicyOutputEventType.JoinGroup, PolicyOutputEventType.CreateGroup]
    })
    async setData(user: IPolicyUser, data: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const did = user?.did;
        const curUser = await PolicyUtils.getUser(ref, did);

        if (!did) {
            throw new BlockActionError('Invalid user', ref.blockType, ref.uuid);
        }

        let group: IUserGroup;
        if (data.invitation) {
            const { uuid, role } = await this.parseInvite(ref, data.invitation);
            group = await this.getGroupByToken(ref, curUser, uuid, role);
        } else if (data.group) {
            const groupConfig = this.getGroupConfig(ref, data.group, data.label);
            group = await this.getGroupByConfig(ref, curUser, groupConfig);
        } else if (data.role) {
            const groupConfig = this.getGroupConfig(ref, data.role, null);
            group = await this.getGroupByConfig(ref, curUser, groupConfig);
        } else {
            throw new BlockActionError('Invalid role', ref.blockType, ref.uuid);
        }
        const ifUserGroup = await ref.databaseServer.checkUserInGroup(group);
        if (ifUserGroup) {
            throw new BlockActionError('You are already a member of the group', ref.blockType, ref.uuid);
        }

        group.messageId = await this.createVC(ref, user, group);

        const userGroup = await ref.databaseServer.setUserInGroup(group);

        const newUser = PolicyUser.create(userGroup, !!ref.dryRun);
        if (data.invitation) {
            ref.triggerEvents(PolicyOutputEventType.JoinGroup, newUser, null);
        } else {
            ref.triggerEvents(PolicyOutputEventType.CreateGroup, newUser, null);
        }

        await PolicyComponentsUtils.UpdateUserInfoFn(user, ref.policyInstance);

        PolicyComponentsUtils.BlockUpdateFn(ref.parent, user);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
            group: group.uuid,
            role: group.role
        }));

        return true;
    }
}
