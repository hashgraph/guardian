import { Message } from './message';
import { IURL } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { RegistrationMessageBody } from './message-body.interface';

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
    public registrationTopicId: string;
    /**
     * Language
     */
    public lang: string;
    /**
     * Attributes
     */
    public attributes: { [x: string]: string } | undefined;

    constructor(action: MessageAction) {
        super(action, MessageType.StandardRegistry);
    }

    /**
     * Set document
     * @param did
     * @param registrationTopicId
     * @param attributes
     */
    public setDocument(did: string, registrationTopicId: string, attributes?: any): void {
        this.did = did;
        this.registrationTopicId = registrationTopicId;
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
            did: this.did,
            topicId: this.registrationTopicId,
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
        message.registrationTopicId = json.topicId;
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
}
