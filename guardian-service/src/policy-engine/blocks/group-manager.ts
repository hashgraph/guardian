import { EventBlock } from '@policy-engine/helpers/decorators';
import { KeyType } from '@helpers/wallet';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { UserType, Schema, GroupRelationshipType, GroupAccessType } from '@guardian/interfaces';
import { findOptions } from '@policy-engine/helpers/find-options';
import { IPolicyAddonBlock, IPolicyDocument, IPolicyInterfaceBlock } from '@policy-engine/policy-engine.interface';
import { DidDocumentBase } from '@hedera-modules';
import { PrivateKey } from '@hashgraph/sdk';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { PolicyRoles } from '@entity/policy-roles';

/**
 * Document action clock with UI
 */
@EventBlock({
    blockType: 'groupManagerBlock',
    commonBlock: false,
    about: {
        label: 'Group Manager',
        title: `Add 'Group Manager' Block`,
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
export class GroupManagerBlock {
    /**
     * Create Policy Invite
     * @param ref
     * @param user
     * @param groupId
     * @param role
     */
    private async createInvite(
        ref: IPolicyInterfaceBlock,
        user: IPolicyUser,
        groupId: string,
        role: string
    ): Promise<string> {
        const group = await ref.databaseServer.getUserInGroup(ref.policyId, user.did, groupId);
        if (!group) {
            throw new Error(`Group not found`);
        }
        if (
            group.groupRelationshipType === GroupRelationshipType.Multiple &&
            group.groupAccessType === GroupAccessType.Private
        ) {
            if (ref.options.canInvite === 'all') {
                const inviteId = await ref.databaseServer.createInviteToken(ref.policyId, group.uuid, user.did, role);
                return Buffer.from(JSON.stringify({
                    invitation: inviteId,
                    role: group.role,
                    policyName: ref.policyInstance?.name
                })).toString('base64');
            } else if (group.owner === user.did) {
                const inviteId = await ref.databaseServer.createInviteToken(ref.policyId, group.uuid, user.did, role);
                return Buffer.from(JSON.stringify({
                    invitation: inviteId,
                    role: group.role,
                    policyName: ref.policyInstance?.name
                })).toString('base64');
            } else {
                throw new Error(`Permission denied`);
            }
        } else {
            throw new Error(`Invalid Group type`);
        }
    }

    private async deleteMember(ref: IPolicyInterfaceBlock, user: IPolicyUser, member: string): Promise<void> {

    }

    private getGroupConfig(ref: IPolicyInterfaceBlock, groupName: string): any {
        const policyGroups: any[] = ref.policyInstance.policyGroups || [];
        return policyGroups.find(e => e.name === groupName);
    }

    private async groupMapping(ref: IPolicyInterfaceBlock, user: IPolicyUser, group: PolicyRoles): Promise<any> {
        const config = this.getGroupConfig(ref, group.groupName);
        const members = (await ref.databaseServer.getAllMembersByGroup(group)).map(member => {
            return {
                username: member.username,
                role: member.role,
                type: member.did === member.owner ? 'Owner' : 'Member',
                current: member.did === user.did
            }
        });
        const canInvite = ref.options.canInvite === 'all' ? true : group.owner === user.did;
        const canDelete = ref.options.canDelete === 'all' ? true : group.owner === user.did;
        return {
            id: group.uuid,
            role: group.role,
            groupName: group.groupName,
            type: group.did === group.owner ? 'Owner' : 'Member',
            groupRelationshipType: group.groupRelationshipType,
            groupAccessType: group.groupAccessType,
            canInvite,
            canDelete,
            roles: canInvite ? config.members : null,
            data: members
        };
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        if (!user && !user.did) {
            throw new Error(`Permission denied`);
        }

        const groups = await ref.databaseServer.getGroupsByUser(ref.policyId, user.did);
        const data: any[] = [];

        for (const group of groups) {
            data.push(await this.groupMapping(ref, user, group));
        }

        return { data };
    }

    /**
     * Set block data
     * @param user
     * @param blockData
     */
    async setData(user: IPolicyUser, blockData: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        if (blockData.action === 'invite') {
            const invitation = await this.createInvite(ref, user, blockData.group, blockData.role);
            return { invitation };
        }
        if (blockData.action === 'delete') {
            await this.deleteMember(ref, user, blockData.username);
            return { deleted: true };
        }
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {

        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
