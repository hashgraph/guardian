import { Message } from './message';
import { IURL } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { SynchronizationMessageBody } from './message-body.interface';

/**
 * Synchronization message
 */
export class SynchronizationMessage extends Message {
    /**
     * Language
     */
    public lang: string;

    constructor(action: MessageAction) {
        super(action, MessageType.Synchronization);
    }

    /**
     * Set document
     */
    public setDocument(): void {
        this.lang = 'en-US';
    }

    /**
     * To message object
     */
    public override toMessageObject(): SynchronizationMessageBody {
        return {
            id: this._id,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
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
    public loadDocuments(documents: string[]): SynchronizationMessage {
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): SynchronizationMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return SynchronizationMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: SynchronizationMessageBody): SynchronizationMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.StandardRegistry) {
            throw new Error('Invalid message type');
        }

        let message = new SynchronizationMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.lang = json.lang;
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
