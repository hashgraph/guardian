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
     */
    private async createInvite(ref: IPolicyInterfaceBlock, user: IPolicyUser): Promise<string> {
        const group = await ref.databaseServer.getGroupByUser(ref.policyId, user.did);
        if (!group) {
            throw new Error(`Group not found`);
        }
        if (
            group.groupRelationshipType === GroupRelationshipType.Multiple &&
            group.groupAccessType === GroupAccessType.Private
        ) {
            if (ref.options.canInvite === 'all') {
                const inviteId = await ref.databaseServer.createInviteToken(ref.policyId, group.uuid, user.did);
                return Buffer.from(JSON.stringify({
                    invitation: inviteId,
                    role: group.role,
                    policyName: ref.policyInstance?.name
                })).toString('base64');
            } else if (group.owner === user.did) {
                const inviteId = await ref.databaseServer.createInviteToken(ref.policyId, group.uuid, user.did);
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

    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        if (!user && !user.did) {
            throw new Error(`Permission denied`);
        }

        const group = await ref.databaseServer.getGroupByUser(ref.policyId, user.did);
        if (group) {
            const role = group.role;
            const visible = ref.options.visible === 'all' ? true : group.owner === user.did;
            const data = await ref.databaseServer.getGroupAllMembers(group);
            if (visible) {
                return {
                    role,
                    groupRelationshipType: group.groupRelationshipType,
                    groupAccessType: group.groupAccessType,
                    visible: true,
                    data: data.map(user => {
                        return {
                            username: user.username,
                            type: user.did === user.owner ? 'Owner' : 'Member'
                        }
                    }),
                    canInvite: ref.options.canInvite === 'all' ? true : group.owner === user.did,
                    canDelete: ref.options.canDelete === 'all' ? true : group.owner === user.did
                };
            } else {
                return {
                    role,
                    groupRelationshipType: group.groupRelationshipType,
                    groupAccessType: group.groupAccessType,
                    visible: false,
                    canInvite: false,
                    canDelete: false,
                    data: []
                };
            }
        } else {
            return {
                role: null,
                groupRelationshipType: null,
                groupAccessType: null,
                visible: false,
                canInvite: false,
                canDelete: false,
            };
        }
    }

    /**
     * Set block data
     * @param user
     * @param blockData
     */
    async setData(user: IPolicyUser, blockData: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        if (blockData.action === 'invite') {
            const invitation = await this.createInvite(ref, user);
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
