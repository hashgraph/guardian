import { assert } from 'chai';

import { Message } from '../../../../dist/hedera-modules/message/message.js';

import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';
import { MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { UrlType } from '../../../../dist/hedera-modules/message/url.interface.js';

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
