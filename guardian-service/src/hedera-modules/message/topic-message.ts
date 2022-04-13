import { Message } from './message';
import { IURL, UrlType } from "./url.interface";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";
import { MessageBody, TopicMessageBody } from './message-body.interface';

export class TopicMessage extends Message {
    public name: string;
    public description: string;
    public owner: string;
    public messageType: string;
    public childId: string;
    public parentId: string;
    public rationale: string;

    constructor(action: MessageAction) {
        super(action, MessageType.Topic);
    }

    public setDocument(topic: {
        name: string,
        description: string,
        owner: string,
        messageType: string,
        childId: string,
        parentId: string,
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

    public override toMessageObject(): TopicMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            name: this.name,
            description: this.description,
            owner: this.owner,
            messageType: this.messageType,
            childId: this.childId,
            parentId: this.parentId,
            rationale: this.rationale,
        };
    }

    public async toDocuments(): Promise<ArrayBuffer[]> {
        return [];
    }

    public loadDocuments(documents: string[]): TopicMessage {
        return this;
    }

    public static fromMessage(message: string): TopicMessage {
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: TopicMessageBody): TopicMessage {
        if (json.type != MessageType.Topic) {
            throw 'Invalid message type'
        }

        const message = new TopicMessage(json.action);
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

    public override validate(): boolean {
        return true;
    }

    public getUrls(): IURL[] {
        return [];
    }
}
