import { TopicType, WorkerTaskType } from '@guardian/interfaces';
import { TopicConfig, MessageAction, MessageServer, TopicMessage } from '.';
import { TopicMemo } from './memo-mappings/topic-memo';
import { Workers } from '../helpers';

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
    private readonly dryRun: string = null;

    constructor(
        operatorId: string,
        operatorKey: string,
        dryRun: string = null
    ) {
        this.dryRun = dryRun || null;
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
     * @param keys
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
            policyUUID?: string,
            /**
             * Topic Memo
             */
            memo?: string,
            /**
             * Memo parameters object
             */
            memoObj?: any
        },
        keys?: {
            /**
             * Need admin key
             */
            admin: boolean,
            /**
             * Need submit key
             */
            submit: boolean
        }
    ): Promise<TopicConfig> {
        const workers = new Workers();
        const topicId = await workers.addRetryableTask({
            type: WorkerTaskType.NEW_TOPIC,
            data: {
                hederaAccountId: this.hederaAccountId,
                hederaAccountKey: this.hederaAccountKey,
                dryRun: this.dryRun,
                topicMemo: TopicMemo.parseMemo(true, config.memo, config.memoObj) || TopicMemo.getTopicMemo(config),
                keys
            }
        }, 10);
        let adminKey: any = null;
        let submitKey: any = null;
        if (keys) {
            if (keys.admin) {
                adminKey = this.hederaAccountKey;
            }
            if (keys.submit) {
                submitKey = this.hederaAccountKey;
            }
        } else {
            adminKey = this.hederaAccountKey;
            submitKey = this.hederaAccountKey;
        }
        return new TopicConfig({
            topicId,
            name: config.name,
            description: config.description,
            owner: config.owner,
            type: config.type,
            policyId: config.policyId,
            policyUUID: config.policyUUID,
        }, adminKey, submitKey);
    }

    /**
     * One way link
     * @param topic
     * @param parent
     * @param rationale
     */
    // tslint:disable-next-line:completed-docs
    public async oneWayLink(topic: TopicConfig, parent: TopicConfig, rationale: string) {
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
    public async twoWayLink(topic: TopicConfig, parent: TopicConfig, rationale: string) {
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
