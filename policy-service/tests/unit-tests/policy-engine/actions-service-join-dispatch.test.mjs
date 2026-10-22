import { assert } from 'chai';
import esmock from 'esmock';
import { MessageAction } from '@guardian/hedera/message/message-action';
import { PolicyStatus } from '@guardian/interfaces';

const SERVICE = '../../../dist/policy-engine/actions-service.js';
const JOIN_SERVICE = '../../../dist/policy-engine/policy-join-service.js';

/*
 * Join requests are for the Main instance (the published policy), replies for the
 * home instance (the VIEW copy). Each instance ignores the messages meant for the other.
 */
async function makeService(status) {
    const calls = { requests: [], replies: [] };
    const { PolicyActionsService } = await esmock(SERVICE, {
        [JOIN_SERVICE]: {
            PolicyJoinService: class {
                async processJoinRequest(data) { calls.requests.push(data); }
                async processJoinReply(message) { calls.replies.push(message); }
            },
        },
    });
    const service = new PolicyActionsService(
        'policy-1',
        {},
        { owner: 'did:policy-owner', status, actionsTopicId: '0.0.1', messageId: 'm-1' },
        'user-1'
    );
    return { service, calls };
}

const topicMessage = (action) => ({
    consensusTimestamp: '1706823300.000000001',
    owner: '0.0.100',
    sequenceNumber: 1,
    topicId: '0.0.1',
    message: JSON.stringify({ type: 'Policy-Action', action, owner: 'did:user', accountId: '0.0.100', cid: 'cid' }),
});

describe('@unit PolicyActionsService – join messages', function () {
    this.timeout(60000);

    it('processes join requests on the Main instance only', async () => {
        const main = await makeService(PolicyStatus.PUBLISH);
        const home = await makeService(PolicyStatus.VIEW);

        await main.service.loadTask(topicMessage(MessageAction.RemotePolicyJoinRequest));
        await home.service.loadTask(topicMessage(MessageAction.RemotePolicyJoinRequest));

        assert.lengthOf(main.calls.requests, 1);
        assert.lengthOf(home.calls.requests, 0);
    });

    it('processes join replies on the home instance only', async () => {
        const main = await makeService(PolicyStatus.PUBLISH);
        const home = await makeService(PolicyStatus.VIEW);

        for (const action of [MessageAction.RemotePolicyJoinAccepted, MessageAction.RemotePolicyJoinRejected]) {
            await main.service.loadTask(topicMessage(action));
            await home.service.loadTask(topicMessage(action));
        }

        assert.lengthOf(main.calls.replies, 0);
        assert.lengthOf(home.calls.replies, 2);
        assert.equal(home.calls.replies[0].parent, undefined);
        assert.equal(home.calls.replies[0].owner, 'did:user');
    });
});
