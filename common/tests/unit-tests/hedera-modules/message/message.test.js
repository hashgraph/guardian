const { expect, assert } = require('chai');

const {
    Message
} = require('../../../../dist/hedera-modules/message/message');

const { MessageType } = require('../../../../dist/hedera-modules/message/message-type');
const { MessageAction } = require('../../../../dist/hedera-modules/message/message-action');
const { MessageStatus } = require('../../../../dist/hedera-modules/message/message');
const { UrlType } = require('../../../../dist/hedera-modules/message/url.interface');

describe('Message', function () {

    const testUrls = [{
        cid: "testCidFirst",
        url: "testUrlFirst"
    }, {
        cid: "testCidSecond",
        url: "testUrlSecond"
    }];
    const testId = "testId";
    const topicId = "testTopicId";

    it('Test Message', async function () {
        const message = new Message(MessageAction.CreateDID, MessageType.DIDDocument);
        assert.equal(message.responseType, "str");
        message.setUrls(testUrls);
        assert.deepEqual(message.getUrls(), testUrls);
        message.setId(testId);
        assert.equal(message.getId(), testId);
        message.setTopicId(topicId);
        assert.equal(message.getTopicId(), topicId);
        assert.equal(message.getUrlValue(0, UrlType.url), testUrls[0].url);
        assert.equal(message.getUrlValue(0, UrlType.cid), testUrls[0].cid);
        message.revoke();

        const messageToMessage = JSON.parse(message.toMessage());
        assert.exists(messageToMessage);
        assert.equal(messageToMessage.status, MessageStatus.REVOKE);
    });
});