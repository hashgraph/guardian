import { Message } from './message.js';
import { IURL } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { RegistrationMessageBody } from './message-body.interface.js';

/**
 * Registration message
 */
export class RegistrationMessage extends Message {
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
        super(action, MessageType.StandardRegistry);
    }

    /**
     * Set document
     * @param did
     * @param topicId
     * @param attributes
     */
    public setDocument(did: string, topicId: string, attributes?: any): void {
        this.did = did;
        this.registrantTopicId = topicId;
        this.lang = 'en-US';
        this.attributes = attributes || {};
    }

    /**
     * To message object
     */
    public override toMessageObject(): RegistrationMessageBody {
        return {
            id: this._id,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            did: this.did,
            topicId: this.registrantTopicId,
            attributes: this.attributes
        }
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
    public loadDocuments(documents: string[]): RegistrationMessage {
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): RegistrationMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return RegistrationMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: RegistrationMessageBody): RegistrationMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.StandardRegistry) {
            throw new Error('Invalid message type');
        }

        let message = new RegistrationMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.did = json.did;
        message.registrantTopicId = json.topicId
        message.lang = json.lang;
        message.account = json.account;
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

    public static fromJson(json: any): RegistrationMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new RegistrationMessage(json.action), json);
        result.did = json.did;
        result.registrantTopicId = json.registrantTopicId;
        result.attributes = json.attributes;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.did;
    }
}
