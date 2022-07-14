import { Topic } from '@entity/topic';
import { HederaSDKHelper, MessageAction, MessageServer, TopicMessage } from '@hedera-modules';
import { TopicType } from '@guardian/interfaces';
import { getMongoRepository } from 'typeorm';

/**
 * Topic helper class
 */
export class TopicHelper {
    /**
     * Account ID
     * @private
     */
    private readonly hederaAccountId: any;
    /**
     * Account key
     * @private
     */
    private readonly hederaAccountKey: any;

    constructor(hederaAccountId: string, hederaAccountKey: string) {
        this.hederaAccountId = hederaAccountId;
        this.hederaAccountKey = hederaAccountKey;
    }

    /**
     * Create instance
     * @param config
     */
    public async create(
        config: {
            /**
             * Type
             */
            type: TopicType,
            /**
             * Owner
             */
            owner: string,
            /**
             * Name
             */
            name?: string,
            /**
             * Description
             */
            description?: string,
            /**
             * Policy ID
             */
            policyId?: string,
            /**
             * Policy UUID
             */
            policyUUID?: string
        }
    ): Promise<Topic> {
        const client = new HederaSDKHelper(this.hederaAccountId, this.hederaAccountKey);
        const topicId = await client.newTopic(this.hederaAccountKey, this.hederaAccountKey, config.type);
        const topicObject = getMongoRepository(Topic).create({
            topicId,
            name: config.name,
            description: config.description,
            owner: config.owner,
            type: config.type,
            key: this.hederaAccountKey,
            policyId: config.policyId,
            policyUUID: config.policyUUID
        });
        return await getMongoRepository(Topic).save(topicObject);
    }

    /**
     * One way link
     * @param topic
     * @param parent
     * @param rationale
     */
    public async oneWayLink(topic: Topic, parent: Topic, rationale: string) {
        const messageServer = new MessageServer(this.hederaAccountId, this.hederaAccountKey);

        const message1 = new TopicMessage(MessageAction.CreateTopic);
        message1.setDocument({
            name: topic.name,
            description: topic.description,
            owner: topic.owner,
            messageType: topic.type,
            childId: null,
            parentId: parent?.topicId,
            rationale
        });

        console.log('0000000000000000 2');
        await messageServer
            .setTopicObject(topic)
            //.sendMessage(message1);
            .sendMessageAsync(message1);
    }

    /**
     * Two way link
     * @param topic
     * @param parent
     * @param rationale
     */
    public async twoWayLink(topic: Topic, parent: Topic, rationale: string) {
        const messageServer = new MessageServer(this.hederaAccountId, this.hederaAccountKey);

        const message1 = new TopicMessage(MessageAction.CreateTopic);
        message1.setDocument({
            name: topic.name,
            description: topic.description,
            owner: topic.owner,
            messageType: topic.type,
            childId: null,
            parentId: parent?.topicId,
            rationale
        });
        console.log('0000000000000000 3');
        await messageServer
            .setTopicObject(topic)
            //.sendMessage(message1);
            .sendMessageAsync(message1);

        if (parent) {
            const message2 = new TopicMessage(MessageAction.CreateTopic);
            message2.setDocument({
                name: topic.name,
                description: topic.description,
                owner: topic.owner,
                messageType: topic.type,
                childId: topic.topicId,
                parentId: null,
                rationale
            });
            console.log('0000000000000000 4');
            await messageServer
                .setTopicObject(parent)
                //.sendMessage(message2);
                .sendMessageAsync(message2);
        }
    }
}
