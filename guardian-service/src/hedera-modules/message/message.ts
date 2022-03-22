import { TopicId } from '@hashgraph/sdk';
import { DIDMessage } from './did-message';
import { VCMessage } from './vc-message';

export enum MessageType {
    VCDocument = 'vc-document',
    DIDDocument = 'did-document',
    PolicyDocument = 'policy-document',
    SchemaDocument = 'schema-document',
}


export enum MessageAction {
    CreateDID = 'create-did-document',
    CreateVC = 'create-vc-document',
    CreatePolicy = 'create-policy',
    PublishPolicy = 'publish-policy',
    CreateSchema = 'create-schema',
    PublishSchema = 'publish-schema'
}

export interface IURL {
    cid: string;
    url: string;
}

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

    public static fromMessage(message: string): Message {
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: any): Message {
        switch (json.type) {
            case MessageType.VCDocument:
                return VCMessage.fromMessageObject(json);
            case MessageType.DIDDocument:
                return DIDMessage.fromMessageObject(json);
            default:
                throw 'Invalid format';
        }
    }

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
}





