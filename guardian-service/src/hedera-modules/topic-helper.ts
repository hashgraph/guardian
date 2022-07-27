import { TopicType } from "@guardian/interfaces";
import { HederaSDKHelper, MessageAction, MessageServer, TopicMessage } from "@hedera-modules";
import { Topic } from '@entity/topic';

/**
 * Topic Helper
 */
export class TopicHelper {
    /**
     * Account ID
     * @private
     */
    private hederaAccountId: string;
    /**
     * Account key
     * @private
     */
    private hederaAccountKey: string;

    /**
     * Dry-run
     * @private
     */
    private dryRun: boolean = false;

    constructor(operatorId: string, operatorKey: string, dryRun: boolean) {
        this.dryRun = dryRun || false;
        this.hederaAccountId = operatorId;
        this.hederaAccountKey = operatorKey;
    }

    /**
     * Create instance
     * @param operatorId
     * @param operatorKey
     */
    public setOperator(operatorId: string, operatorKey: string): void {
        this.hederaAccountId = operatorId;
        this.hederaAccountKey = operatorKey;
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
        const client = new HederaSDKHelper(this.hederaAccountId, this.hederaAccountKey, this.dryRun);
        const topicId = await client.newTopic(this.hederaAccountKey, this.hederaAccountKey, config.type);
        return {
            topicId,
            name: config.name,
            description: config.description,
            owner: config.owner,
            type: config.type,
            key: this.hederaAccountKey,
            policyId: config.policyId,
            policyUUID: config.policyUUID
        } as Topic;
    }

    /**
     * One way link
     * @param topic
     * @param parent
     * @param rationale
     */
    public async oneWayLink(topic: Topic, parent: Topic, rationale: string) {
        const messageServer = new MessageServer(this.hederaAccountId, this.hederaAccountKey, this.dryRun);

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

        await messageServer
            .setTopicObject(topic)
            .sendMessage(message1);
    }

    /**
     * Two way link
     * @param topic
     * @param parent
     * @param rationale
     */
    public async twoWayLink(topic: Topic, parent: Topic, rationale: string) {
        const messageServer = new MessageServer(this.hederaAccountId, this.hederaAccountKey, this.dryRun);

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
                rationale
            });
            await messageServer
                .setTopicObject(parent)
                .sendMessage(message2);
        }
    }
}