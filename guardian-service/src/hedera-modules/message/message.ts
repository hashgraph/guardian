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
}

export interface URL {
    cid: string;
    url: string;
}

export abstract class Message {
    public id: string;
    public urls: URL[];
    public topicId: string | TopicId;

    public readonly action: string;
    public readonly type: MessageType;

    constructor(action: string, type: MessageType) {
        this.action = action;
        this.type = type;
    }

    public abstract toMessage(): string;
    public abstract toDocuments(): string[];
    public abstract loadDocuments(documents: string[]): Message;

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
                throw 'Invalid format'
        }
    }

    public setUrls(url: URL[]): void {
        this.urls = url;
    }

    public setId(id: string): void {
        this.id = id;
    }

    public setTopicId(topicId: string | TopicId): void {
        this.topicId = topicId;
    }
}





