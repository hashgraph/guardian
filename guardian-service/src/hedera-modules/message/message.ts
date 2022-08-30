import { TopicId } from '@hashgraph/sdk';
import { IURL, UrlType } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { MessageBody } from './message-body.interface';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Message status
 */
export enum MessageStatus {
    ISSUE = 'ISSUE',
    REVOKE = 'REVOKE',
    DELETED = 'DELETED'
}

/**
 * Revoke message
 */
export enum RevokeReason {
    DocumentRevoked = 'Document Revoked',
    ParentRevoked = 'Parent Revoked'
}

/**
 * Message
 */
export abstract class Message {
    /**
     * Id
     */
    public id: string;
    /**
     * URLs
     */
    public urls: IURL[];
    /**
     * Topic ID
     */
    public topicId: string | TopicId;
    /**
     * Language
     */
    public lang: string;

    /**
     * Message action
     */
    public readonly action: MessageAction;
    /**
     * Message type
     */
    public readonly type: MessageType;

    /**
     * Response type
     * @protected
     */
    protected _responseType: 'json' | 'raw' | 'str';
    /**
     * _id
     * @protected
     */
    protected _id: string;
    /**
     * Message status
     * @protected
     */
    protected _status: MessageStatus;
    /**
     * Revoke message
     * @protected
     */
    protected _revokeMessage: string;
    /**
     * Revoke reason
     * @protected
     */
    protected _revokeReason: string;
    /**
     * Parent ids
     * @protected
     */
    protected _parentIds: string[];
    /**
     * Delete message
     * @protected
     */
    protected _deleteMessage: string;

    /**
     * Response type
     */
    get responseType() {
        return this._responseType;
    }

    constructor(action: MessageAction, type: MessageType) {
        this.action = action;
        this.type = type;
        this._responseType = 'str';
        this._id = GenerateUUIDv4();
        this._status = MessageStatus.ISSUE;
        this.lang = 'en-US';
    }

    /**
     * To message object
     */
    public abstract toMessageObject(): MessageBody;

    /**
     * To document
     */
    public abstract toDocuments(): Promise<ArrayBuffer[]>;

    /**
     * Load documents
     * @param documents
     */
    public abstract loadDocuments(documents: any[]): Message;

    /**
     * Set URLs
     * @param url
     */
    public setUrls(url: IURL[]): void {
        this.urls = url;
    }

    /**
     * Get URLs
     */
    public getUrls(): IURL[] {
        return this.urls;
    }

    /**
     * Set id
     * @param id
     */
    public setId(id: string): void {
        this.id = id;
    }

    /**
     * Set topic id
     * @param topicId
     */
    public setTopicId(topicId: string | TopicId): void {
        this.topicId = topicId;
    }

    /**
     * Get URL
     */
    public getUrl(): any {
        return this.urls;
    }

    /**
     * Get ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Get message id
     */
    public getMessageId(): string {
        return this._id;
    }

    /**
     * Get topic ID
     */
    public getTopicId(): string {
        if (this.topicId) {
            return this.topicId.toString();
        }
        return null
    }

    /**
     * Validate
     */
    public abstract validate(): boolean;

    /**
     * Get URL value
     * @param index
     * @param type
     */
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

    /**
     * Revoke
     * @param message
     * @param parentIds
     */
    public revoke(message: string, parentIds?: string[]): void {
        this._status = MessageStatus.REVOKE;
        this._revokeMessage = message;
        this._revokeReason = parentIds
            ? RevokeReason.ParentRevoked
            : RevokeReason.DocumentRevoked;
        this._parentIds = parentIds;
    }

    /**
     * Delete
     * @param message
     * @param parentIds
     */
    public delete(message: string, parentIds?: string[]): void {
        this._status = MessageStatus.DELETED;
        this._deleteMessage = message;
        this._parentIds = parentIds;
    }

    /**
     * Is revoked
     */
    public isRevoked() {
        return this._status === MessageStatus.REVOKE;
    }

    /**
     * To message
     */
    public toMessage(): string {
        if (this._status === MessageStatus.REVOKE) {
            const body: MessageBody = {
                id: this._id,
                status: this._status,
                type: this.type,
                action: this.action,
                lang: this.lang,
                revokeMessage: this._revokeMessage,
                reason: this._revokeReason,
                parentIds: this._parentIds
            }
            return JSON.stringify(body);
        } else if (this._status === MessageStatus.DELETED) {
            const body: MessageBody = {
                id: this._id,
                status: this._status,
                type: this.type,
                action: this.action,
                lang: this.lang,
                deleteMessage: this._deleteMessage
            }
            return JSON.stringify(body);
        } else {
            const body = this.toMessageObject();
            body.id = this._id;
            body.status = this._status;
            return JSON.stringify(body);
        }
    }

    /**
     * Set language
     * @param lang
     */
    public setLang(lang: string) {
        this.lang = lang || 'en-US';
    }
}
