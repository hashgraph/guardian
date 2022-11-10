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
    DELETED = 'DELETED',
    WITHDRAW = 'WITHDRAW'
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
    private urls: IURL[];
    /**
     * Topic ID
     */
    public topicId: string | TopicId;
    /**
     * Language
     */
    public lang: string;

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
     * Parent ids
     * @protected
     */
    protected _parentIds: string[];
    /**
     * Status message
     * @protected
     */
    protected _statusMessage: string;
    /**
     * Revoke reason
     * @protected
     */
    protected _statusReason: string;
    /**
     * Message action
     */
    protected _action: MessageAction;

    /**
     * Response type
     */
    get responseType() {
        return this._responseType;
    }

    constructor(action: MessageAction, type: MessageType) {
        this.type = type;
        this.lang = 'en-US';
        this._action = action;
        this._responseType = 'str';
        this._id = GenerateUUIDv4();
        this._status = MessageStatus.ISSUE;
    }

    /**
     * Message action
     */
    public get action(): MessageAction {
        return this._action;
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
        this.urls = url?.filter(u => {
            return !!u.cid
        });
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
            switch (type) {
                case UrlType.cid:
                    return this.urls[index].cid;
                case UrlType.url:
                    return this.urls[index].url;
                case UrlType.custom_context_url:
                    return (
                        process.env.IPFS_CONTEXT_GATEWAY + this.urls[index].cid
                    );
                default:
                    break;
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
        this._statusMessage = message;
        this._statusReason = parentIds
            ? RevokeReason.ParentRevoked
            : RevokeReason.DocumentRevoked;
        this._parentIds = parentIds;
        this._action = MessageAction.RevokeDocument;
    }

    /**
     * Delete
     * @param message
     * @param parentIds
     */
    public delete(message: string, parentIds?: string[]): void {
        this._status = MessageStatus.DELETED;
        this._statusMessage = message;
        this._parentIds = parentIds;
        this._statusReason = 'Document Deleted';
        this._action = MessageAction.DeleteDocument;
    }

    /**
     * Is revoked
     */
    public isRevoked() {
        return this._status === MessageStatus.REVOKE;
    }

    /**
     * Change message status
     * @param status
     * @param message
     */
    public setMessageStatus(status: MessageStatus, message: string): void {
        this._status = status;
        this._statusMessage = message;
        this._statusReason = 'Change Status';
        this._action = MessageAction.ChangeMessageStatus;
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
                revokeMessage: this._statusMessage,
                reason: this._statusReason,
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
                deleteMessage: this._statusMessage,
                reason: this._statusReason
            }
            return JSON.stringify(body);
        } else if (this._status === MessageStatus.ISSUE) {
            const body = this.toMessageObject();
            body.id = this._id;
            body.status = this._status;
            return JSON.stringify(body);
        } else {
            const body: MessageBody = {
                id: this._id,
                status: this._status,
                type: this.type,
                action: this.action,
                lang: this.lang,
                statusMessage: this._statusMessage,
                reason: this._statusReason
            }
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

    /**
     * From message object
     * @param json
     */
    protected static _fromMessageObject<T extends Message>(message: T, json: MessageBody): T {
        if (!json) {
            throw new Error('JSON Object is empty');
        }
        message._id = json.id;
        message._status = json.status;
        if (message._status === MessageStatus.REVOKE) {
            message._statusMessage = json.revokeMessage;
            message._statusReason = json.reason;
            return message;
        } else if (message._status === MessageStatus.DELETED) {
            message._statusMessage = json.deleteMessage;
            message._statusReason = json.reason;
            return message;
        } else if (message._status === MessageStatus.ISSUE) {
            return message;
        } else {
            message._statusMessage = json.statusMessage;
            message._statusReason = json.reason;
            return message;
        }
    }
}
