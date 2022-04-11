import { Message } from './message';
import { IURL, UrlType } from "./i-url";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";

export class TopicMessage extends Message {
    public name: string;
    public description: string;
    public owner: string;
    public topicType: string;
    public topicId: string;
    public parentId: string;

    constructor(action: MessageAction) {
        super(action, MessageType.TopicDocument);
    }


    public setDocument(topic: {
        name: string,
        description: string,
        owner: string,
        topicType: string,
        topicId: string,
        parentId: string
    }): void {
        this.name = topic.name;
        this.description = topic.description;
        this.owner = topic.owner;
        this.topicType = topic.topicType;
        this.topicId = topic.topicId;
        this.parentId = topic.parentId;
    }

    public toMessage(): string {
        return JSON.stringify({
            type: this.type,
            action: this.action,
            name: this.name,
            description: this.description,
            owner: this.owner,
            topicType: this.topicType,
            topicId: this.topicId,
            parentId: this.parentId,
        });
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

    public static fromMessageObject(json: any): TopicMessage {
        const message = new TopicMessage(json.action);
        message.name = json.name;
        message.description = json.description;
        message.owner = json.owner;
        message.topicType = json.topicType;
        message.topicId = json.topicId;
        message.parentId = json.parentId;

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
