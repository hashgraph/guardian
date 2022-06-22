import { Message } from './message';
import { IURL } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { RegistrationMessageBody } from './message-body.interface';

export class RegistrationMessage extends Message {
    public did: string;
    public topicId: string;
    public lang: string;
    public attributes: { [x: string]: string } | undefined;

    constructor(action: MessageAction) {
        super(action, MessageType.StandardRegistry);
    }

    public setDocument(did: string, topicId: string, attributes?: any): void {
        this.did = did;
        this.topicId = topicId;
        this.lang = 'en-US';
        this.attributes = attributes || {};
    }

    public override toMessageObject(): RegistrationMessageBody {
        return {
            id: this._id,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            did: this.did,
            topicId: this.topicId,
            attributes: this.attributes
        }
    }

    public async toDocuments(): Promise<ArrayBuffer[]> {
        return [];
    }

    public loadDocuments(documents: string[]): RegistrationMessage {
        return this;
    }

    public static fromMessage(message: string): RegistrationMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: RegistrationMessageBody): RegistrationMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type != MessageType.StandardRegistry) {
            throw 'Invalid message type';
        }

        const message = new RegistrationMessage(json.action);
        message._id = json.id;
        message._status = json.status;
        message.did = json.did;
        message.topicId = json.topicId;
        message.lang = json.lang;
        message.attributes = json.attributes || {};
        return message;
    }

    public override validate(): boolean {
        return true;
    }

    public getUrls(): IURL[] {
        return [];
    }
}
