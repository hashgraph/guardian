import { Message } from './message.js';
import { IURL } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { UserMessageBody } from './message-body.interface.js';

/**
 * Registration message
 */
export class UserMessage extends Message {
    /**
     * DID
     */
    public did: string;
    /**
     * Topic ID
     */
    declare public topicId: string;
    /**
     * Language
     */
    declare public lang: string;
    /**
     * Attributes
     */
    public attributes: { [x: string]: string } | undefined;

    /**
     * Registrant topicId
     */
    public registrantTopicId: string;

    constructor(action: MessageAction) {
        super(action, MessageType.User);
    }

    /**
     * Set document
     * @param did
     * @param topicId
     * @param attributes
     */
    public setDocument(user: any): void {
        this.did = user.did;
        this.registrantTopicId = user.topicId;
        this.lang = 'en-US';
        this.attributes = {};
    }

    /**
     * To message object
     */
    public override toMessageObject(): UserMessageBody {
        return {
            id: this._id,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            did: this.did,
            topicId: this.registrantTopicId,
            attributes: this.attributes
        }
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<ArrayBuffer[]> {
        return [];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: string[]): UserMessage {
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): UserMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return UserMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: UserMessageBody): UserMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.User) {
            throw new Error('Invalid message type');
        }

        let message = new UserMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.did = json.did;
        message.registrantTopicId = json.topicId
        message.lang = json.lang;
        message.attributes = json.attributes || {};
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
        result.did = this.did;
        result.registrantTopicId = this.registrantTopicId;
        result.attributes = this.attributes;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.did;
    }
}
