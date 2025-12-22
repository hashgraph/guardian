import { ActionCallback, EventBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { PolicyUser } from '../policy-user.js';
import { DocumentCategoryType, GroupAccessType, GroupRelationshipType, LocationType, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { BlockActionError } from '../errors/index.js';
import { AnyBlockType, IPolicyGetData } from '../policy-engine.interface.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyActionsUtils } from '../policy-actions/utils.js';
import { IAuthUser } from '@guardian/common';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

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
    actionType: LocationType.REMOTE,
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
        const uuid: string = await ref.components.generateUUID();
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
                        uuid,
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
                    uuid,
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
                uuid,
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
    private async createVC(ref: AnyBlockType, user: PolicyUser, group: IUserGroup): Promise<string> {
        const policySchema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.USER_ROLE);
        if (!policySchema) {
            return null;
        }

        const uuid: string = await ref.components.generateUUID();
        const vcSubject: any = {
            ...SchemaHelper.getContext(policySchema),
            id: uuid,
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

        const relayerAccount = await PolicyUtils.getUserRelayerAccount(ref, user.did, null, user.userId);
        const { vc, message } = await PolicyActionsUtils.signAndSendRole({
            ref,
            subject: vcSubject,
            group,
            uuid,
            relayerAccount,
            userId: user.userId
        });

        const vcDocument = PolicyUtils.createVC(ref, user, vc);

        const tags = await PolicyUtils.getBlockTags(ref);
        PolicyUtils.setDocumentTags(vcDocument, tags);

        vcDocument.type = DocumentCategoryType.USER_ROLE;
        vcDocument.schema = `#${vc.getSubjectType()}`;
        vcDocument.messageId = message.getId();
        vcDocument.topicId = message.getTopicId();
        vcDocument.relationships = null;
        vcDocument.relayerAccount = null;
        await ref.databaseServer.saveVC(vcDocument);
        return message.getId();
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
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
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
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
    async setData(user: PolicyUser, data: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const did = user?.did;
        const curUser = await PolicyUtils.getUser(ref, did, user.userId);

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
        const newUser = await PolicyComponentsUtils.GetPolicyUserByGroup(userGroup, ref, user.userId);
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
        ref.backup();

        PolicyComponentsUtils.updateUserRole(ref.policyId, user.did).then();

        return true;
    }
}
