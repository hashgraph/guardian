import { PolicyActionType } from './policy-action.type.js';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { KeyType, Wallet } from '@guardian/common/helpers/wallet';
import { PolicyAction } from '@guardian/common/entity/policy-action';
import { PolicyDiscussion } from '@guardian/common/entity/policy-discussion';

export class PolicyDiscussionAction {
    public static async request(options: {
        policyId: string,
        discussion: PolicyDiscussion,
        key: string,
        userId: string | null
    }): Promise<any> {
        const { discussion, key } = options;
        const data = {
            type: PolicyActionType.CreatePolicyDiscussion,
            discussion,
            key
        };
        return data;
    }

    public static async complete(
        row: PolicyAction,
        policyOwner: string
    ): Promise<PolicyDiscussion> {
        const discussion = row?.document?.discussion;
        const key = row?.document?.key;
        const wallet = new Wallet();
        wallet.setUserKey(
            policyOwner,
            KeyType.DISCUSSION,
            discussion.messageId,
            key,
            null
        )
        return await DatabaseServer.createPolicyDiscussion(discussion);
    }
}
