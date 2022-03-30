import { TopicId } from '@hashgraph/sdk';
import { IURL } from './i-url';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';

export abstract class Message {
    public id: string;
    public urls: IURL[];
    public topicId: string | TopicId;

    public readonly action: MessageAction;
    public readonly type: MessageType;

    protected _responseType: "json" | "raw" | "str";

    get responseType() {
        return this._responseType;
    }

    constructor(action: MessageAction, type: MessageType) {
        this.action = action;
        this.type = type;
        this._responseType = "str";
    }

    public abstract toMessage(): string;
    public abstract toDocuments(): Promise<ArrayBuffer[]>;
    public abstract loadDocuments(documents: any[]): Message;

    public setUrls(url: IURL[]): void {
        this.urls = url;
    }

    public setId(id: string): void {
        this.id = id;
    }

    public setTopicId(topicId: string | TopicId): void {
        this.topicId = topicId;
    }

    public getUrl(): any {
        return this.urls;
    }

    public getId(): string {
        return this.id;
    }

    public getTopicId(): string | TopicId {
        return this.topicId;
    }

    public abstract validate(): boolean;
}





