import { Topic } from '@entity/topic';
import { TopicType } from '@guardian/interfaces';
import { KeyType, Wallet } from '@helpers/wallet';

export class TopicConfig {
    /**
     * Topic ID
     */
    public topicId: string;
    /**
     * Topic name
     */
    public name: string;
    /**
     * Topic description
     */
    public description: string;
    /**
     * Owner
     */
    public owner: string;
    /**
     * Parent
     */
    public parent: string;
    /**
     * Topic Type
     */
    public type: string;
    /**
     * Policy Id
     */
    public policyId: string;
    /**
     * Policy Id
     */
    public policyUUID: string;
    /**
     * Admin Key
     */
    public adminKey: string;
    /**
     * Submit Key
     */
    public submitKey: string;

    constructor(topic: {
        /**
         * Type
         */
        topicId?: string,
        /**
         * Name
         */
        name?: string,
        /**
         * Description
         */
        description?: string,
        /**
         * Owner
         */
        owner?: string,
        /**
         * Type
         */
        type?: TopicType,
        /**
         * Policy ID
         */
        policyId?: string,
        /**
         * Policy UUID
         */
        policyUUID?: string,
    }, adminKey?: string, submitKey?: string) {
        this.topicId = topic.topicId;
        this.name = topic.name;
        this.description = topic.description;
        this.owner = topic.owner;
        this.type = topic.type;
        this.policyId = topic.policyId;
        this.policyUUID = topic.policyUUID;
        this.submitKey = submitKey;
        this.adminKey = adminKey;
    }

    public static async fromObject(topic: Topic, needKey: boolean = false): Promise<TopicConfig> {
        if (!topic) {
            return null;
        }
        if (needKey) {
            const wallet = new Wallet();
            const submitKey = await wallet.getUserKey(
                topic.owner,
                KeyType.TOPIC_SUBMIT_KEY,
                topic.topicId
            );
            return new TopicConfig(topic, null, submitKey);
        } else {
            return new TopicConfig(topic, null, null);
        }
    }

    public toObject(): any {
        return {
            topicId: this.topicId,
            name: this.name,
            description: this.description,
            owner: this.owner,
            type: this.type,
            parent: this.parent,
            policyId: this.policyId,
            policyUUID: this.policyUUID,
        }
    }
}