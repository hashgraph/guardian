import { assert } from 'chai';

import { TopicMessage } from '../../../../dist/hedera-modules/message/topic-message.js';

import { MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';

describe('TopicMessage', function () {

    const testTopicMessage = {
        id: "testId",
        status: MessageStatus.ISSUE,
        type: MessageType.Topic,
        action: MessageAction.CreateSchema,
        name: "testName",
        description: "testDescription",
        owner: "testOwner",
        messageType: "testMessageType",
        childId: "testChildId",
        parentId: "testParentId",
        rationale: "testRationale",
        account: "0.0.1",
        lang: "test"
    }

    it('Test TopicMessage', async function () {
        assert.throws(TopicMessage.fromMessageObject);
        assert.throws(TopicMessage.fromMessage);

        const topicMessage = new TopicMessage(MessageAction.CreateTopic);
        assert.exists(topicMessage);

        topicMessage.setDocument(testTopicMessage);
        topicMessage.setOwnerAccount('0.0.1');
        assert.hasAllKeys(topicMessage.toMessageObject(), Object.keys(testTopicMessage));
        assert.isTrue(topicMessage.validate());

        const topicMessageByTestMessage = TopicMessage.fromMessageObject(testTopicMessage);
        assert.exists(topicMessageByTestMessage);
        assert.deepEqual(topicMessageByTestMessage.getUrl(), []);

        const topicMessageByTestJSON = TopicMessage.fromMessage(JSON.stringify(testTopicMessage));
        assert.exists(topicMessageByTestJSON);
        assert.deepEqual(topicMessageByTestMessage.getUrl(), []);
    });
});
