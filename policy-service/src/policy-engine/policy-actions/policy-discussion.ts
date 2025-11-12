import { PolicyActionType } from './policy-action.type.js';
import { DatabaseServer, PolicyAction, PolicyDiscussion } from '@guardian/common';

export class PolicyDiscussionAction {
    public static async request(options: {
        policyId: string,
        discussion: PolicyDiscussion,
        userId: string | null
    }): Promise<any> {
        const { discussion } = options;
        const data = {
            type: PolicyActionType.CreatePolicyDiscussion,
            discussion
        };
        return data;
    }

    public static async complete(
        row: PolicyAction
    ): Promise<PolicyDiscussion> {
        const data = row?.document;
        return await DatabaseServer.createPolicyDiscussion(data);
    }
}
