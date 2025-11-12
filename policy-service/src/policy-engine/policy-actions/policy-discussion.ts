import { PolicyActionType } from './policy-action.type.js';
import { DatabaseServer, KeyType, PolicyAction, PolicyDiscussion, Wallet } from '@guardian/common';

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
