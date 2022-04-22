import { Topic } from '@entity/topic';
import { HederaSDKHelper, MessageAction, MessageServer, MessageType, TopicMessage } from '@hedera-modules';
import { TopicType } from 'interfaces';
import { getMongoRepository } from 'typeorm';

export class TopicHelper {
    private hederaAccountId: any;
    private hederaAccountKey: any;

    constructor(hederaAccountId: string, hederaAccountKey: string) {
        this.hederaAccountId = hederaAccountId;
        this.hederaAccountKey = hederaAccountKey;
    }

    public async create(
        config: {
            type: TopicType,
            owner: string,
            name?: string,
            description?: string,
            policyId?: string,
            policyUUID?: string
        }
    ): Promise<Topic> {
        const client = new HederaSDKHelper(this.hederaAccountId, this.hederaAccountKey);
        const topicId = await client.newTopic(this.hederaAccountKey, this.hederaAccountKey, config.type);
        const topicObject = getMongoRepository(Topic).create({
            topicId: topicId,
            name: config.name,
            description: config.description,
            owner: config.owner,
            type: config.type,
            key: this.hederaAccountKey,
            policyId: config.policyId,
            policyUUID: config.policyUUID
        });
        const topic = await getMongoRepository(Topic).save(topicObject);
        return topic;
    }

    public async link(topic: Topic, parent: Topic, rationale: string) {
        const messageServer = new MessageServer(this.hederaAccountId, this.hederaAccountKey);

        const message1 = new TopicMessage(MessageAction.CreateTopic);
        message1.setDocument({
            name: topic.name,
            description: topic.description,
            owner: topic.owner,
            messageType: topic.type,
            childId: null,
            parentId: parent?.topicId,
            rationale: rationale
        });
        await messageServer
            .setTopicObject(topic)
            .sendMessage(message1);

        if (parent) {
            const message2 = new TopicMessage(MessageAction.CreateTopic);
            message2.setDocument({
                name: topic.name,
                description: topic.description,
                owner: topic.owner,
                messageType: topic.type,
                childId: topic.topicId,
                parentId: null,
                rationale: rationale
            });
            await messageServer
                .setTopicObject(parent)
                .sendMessage(message2);
        }
    }
}
