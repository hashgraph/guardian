const { expect, assert } = require('chai');

const {
    PolicyMessage
} = require('../../../../dist/hedera-modules/message/policy-message');

const { MessageStatus } = require('../../../../dist/hedera-modules/message/message');
const { MessageType } = require('../../../../dist/hedera-modules/message/message-type');
const { MessageAction } = require('../../../../dist/hedera-modules/message/message-action');
const { UrlType } = require('../../../../dist/hedera-modules/message/url.interface');

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