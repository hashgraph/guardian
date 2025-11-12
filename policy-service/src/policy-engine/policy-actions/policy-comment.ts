import { PolicyActionType } from './policy-action.type.js';
import { DatabaseServer, PolicyAction, PolicyComment } from '@guardian/common';

export class PolicyCommentAction {
    public static async request(options: {
        policyId: string,
        comment: PolicyComment,
        userId: string | null
    }): Promise<any> {
        const { comment } = options;
        const data = {
            type: PolicyActionType.CreatePolicyComment,
            comment
        };
        return data;
    }

    public static async complete(
        row: PolicyAction
    ): Promise<PolicyComment> {
        const data = row?.document;
        const commentRow = await DatabaseServer.createPolicyComment(data);
        const discussion = await DatabaseServer.getPolicyDiscussion({
            _id: DatabaseServer.dbID(commentRow.discussionId),
            policyId: commentRow.policyId
        });
        discussion.count = await DatabaseServer.getPolicyCommentsCount({
            discussionId: discussion.id,
            policyId: commentRow.policyId
        })
        await DatabaseServer.updatePolicyDiscussion(discussion);
        return commentRow;
    }
}
