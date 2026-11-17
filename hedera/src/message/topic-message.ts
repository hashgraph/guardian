import { Message } from './message.js';
import { IURL } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { TopicMessageBody } from './message-body.interface.js';

/**
 * Topic message
 */
export class TopicMessage extends Message {
    /**
     * Name
     */
    public name: string;
    /**
     * Description
     */
    public description: string;
    /**
     * Owner
     */
    public owner: string;
    /**
     * Message type
     */
    public messageType: string;
    /**
     * Child ID
     */
    public childId: string;
    /**
     * Parent ID
     */
    public parentId: string;
    /**
     * Rationale
     */
    public rationale: string;

    constructor(action: MessageAction) {
        super(action, MessageType.Topic);
    }

    /**
     * Set document
     * @param topic
     */
    public setDocument(topic: {
        /**
         * Name
         */
        name: string,
        /**
         * Description
         */
        description: string,
        /**
         * Owner
         */
        owner: string,
        /**
         * Message type
         */
        messageType: string,
        /**
         * Child ID
         */
        childId: string,
        /**
         * Parent ID
         */
        parentId: string,
        /**
         * Rationale
         */
        rationale: string
    }): void {
        this.name = topic.name;
        this.description = topic.description;
        this.owner = topic.owner;
        this.messageType = topic.messageType;
        this.childId = topic.childId;
        this.parentId = topic.parentId;
        this.rationale = topic.rationale;
    }

    /**
     * To message object
     */
    public override toMessageObject(): TopicMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            name: this.name,
            description: this.description,
            owner: this.owner,
            messageType: this.messageType,
            childId: this.childId,
            parentId: this.parentId,
            rationale: this.rationale,
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<Buffer[]> {
        return [];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: string[]): TopicMessage {
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): TopicMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return TopicMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: TopicMessageBody): TopicMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.Topic) {
            throw new Error('Invalid message type');
        }

        let message = new TopicMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.name = json.name;
        message.description = json.description;
        message.owner = json.owner;
        message.messageType = json.messageType;
        message.childId = json.childId;
        message.parentId = json.parentId;
        message.rationale = json.rationale;

        const urls = []
        message.setUrls(urls);
        return message;
    }

    /**
     * Validate
     */
    public override validate(): boolean {
        return true;
    }

    /**
     * Get URLs
     */
    public getUrls(): IURL[] {
        return [];
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.name = this.name;
        result.description = this.description;
        result.owner = this.owner;
        result.messageType = this.messageType;
        result.childId = this.childId;
        result.parentId = this.parentId;
        result.rationale = this.rationale;
        return result;
    }

    public static fromJson(json: any): TopicMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new TopicMessage(json.action), json);
        result.name = json.name;
        result.description = json.description;
        result.owner = json.owner;
        result.messageType = json.messageType;
        result.childId = json.childId;
        result.parentId = json.parentId;
        result.rationale = json.rationale;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.owner;
    }
}
