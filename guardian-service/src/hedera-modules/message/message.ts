import { TopicId } from '@hashgraph/sdk';
import { IURL, UrlType } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { MessageBody } from './message-body.interface';
import { HederaUtils } from './../utils';

export enum MessageStatus {
    ISSUE = 'ISSUE',
    REVOKE = 'REVOKE'
}

export enum RevokeReason {
    DocumentRevoked = 'Document Revoked',
    ParentRevoked = 'Parent Revoked'
}

export abstract class Message {
    public id: string;
    public urls: IURL[];
    public topicId: string | TopicId;

    public readonly action: MessageAction;
    public readonly type: MessageType;

    protected _responseType: "json" | "raw" | "str";
    protected _id: string;
    protected _status: MessageStatus;
    protected _revokeMessage: string;
    protected _revokeReason: string;
    protected _parentIds: string[];

    get responseType() {
        return this._responseType;
    }

    constructor(action: MessageAction, type: MessageType) {
        this.action = action;
        this.type = type;
        this._responseType = "str";
        this._id = HederaUtils.randomUUID();
        this._status = MessageStatus.ISSUE;
    }

    public abstract toMessageObject(): MessageBody;
    public abstract toDocuments(): Promise<ArrayBuffer[]>;
    public abstract loadDocuments(documents: any[]): Message;

    public setUrls(url: IURL[]): void {
        this.urls = url;
    }

    public getUrls(): IURL[] {
        return this.urls;
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

    public getMessageId(): string {
        return this._id;
    }

    public getTopicId(): string {
        if(this.topicId) {
            return this.topicId.toString();
        }
        return null
    }

    public abstract validate(): boolean;

    public getUrlValue(index: number, type: UrlType): string | null {
        if (this.urls && this.urls[index]) {
            if (type === UrlType.cid) {
                return this.urls[index].cid;
            } else {
                return this.urls[index].url;
            }
        }
        return null;
    }

    public revoke(message: string, parentIds?: string[]): void {
        this._status = MessageStatus.REVOKE;
        this._revokeMessage = message;
        this._revokeReason = parentIds 
            ? RevokeReason.ParentRevoked 
            : RevokeReason.DocumentRevoked;
        this._parentIds = parentIds;
    }

    public isRevoked() {
        return this._status === MessageStatus.REVOKE;
    }

    public toMessage(): string {
        if (this._status == MessageStatus.REVOKE) {
            const body: MessageBody = {
                id: this._id,
                status: this._status,
                type: this.type,
                action: this.action,
                revokeMessage: this._revokeMessage,
                reason: this._revokeReason,
                parentIds: this._parentIds
            }
            return JSON.stringify(body);
        } else {
            const body = this.toMessageObject();
            body.id = this._id;
            body.status = this._status;
            return JSON.stringify(body);
        }
    }
}
