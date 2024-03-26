import { assert } from 'chai';

import { PolicyMessage } from '../../../../dist/hedera-modules/message/policy-message.js';

import { MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';
import { UrlType } from '../../../../dist/hedera-modules/message/url.interface.js';

describe('PolicyMessage', function () {

    const testPolicyMessage = {
        id: "testId",
        status: MessageStatus.ISSUE,
        type: MessageType.Policy,
        action: MessageAction.CreatePolicy,
        uuid: "testUUID",
        name: "testName",
        description: "testDescription",
        topicDescription: "testTopicDescription",
        version: "testVersion",
        policyTag: "testPolicyTag",
        owner: "testOwner",
        topicId: "testTopicId",
        instanceTopicId: "testInstanceTopicId",
        cid: "testCID",
        url: "ipfs://testCID"
    };
    const testDocumentObject = JSON.stringify({
        name: "testDocumentName"
    });

    it('Test PolicyMessage', async function () {
        assert.throws(PolicyMessage.fromMessageObject);
        assert.throws(PolicyMessage.fromMessage);

        const policyMessage = new PolicyMessage(MessageType.Policy, MessageAction.CreatePolicy);
        policyMessage.setDocument(testPolicyMessage, null);
        assert.isNull(policyMessage.getDocument())

        policyMessage.loadDocuments([testDocumentObject]);
        assert.exists(policyMessage.toDocuments());
        assert.isTrue(policyMessage.validate())

        const policyMessageByTestMessage = PolicyMessage.fromMessageObject(testPolicyMessage);
        assert.exists(policyMessageByTestMessage);
        assert.deepEqual(policyMessageByTestMessage.getUrl(), { cid: testPolicyMessage.cid, url: testPolicyMessage.url });
        assert.equal(policyMessageByTestMessage.getDocumentUrl(UrlType.cid), testPolicyMessage.cid);
        assert.equal(policyMessageByTestMessage.getDocumentUrl(UrlType.url), testPolicyMessage.url);

        const policyMessageByTestJSON = PolicyMessage.fromMessage(JSON.stringify(testPolicyMessage));
        assert.exists(policyMessageByTestJSON);
        assert.deepEqual(policyMessageByTestJSON.getUrl(), { cid: testPolicyMessage.cid, url: testPolicyMessage.url });
        assert.equal(policyMessageByTestJSON.getDocumentUrl(UrlType.cid), testPolicyMessage.cid);
        assert.equal(policyMessageByTestJSON.getDocumentUrl(UrlType.url), testPolicyMessage.url);
    });
});
