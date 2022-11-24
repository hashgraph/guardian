import { Message } from './message';
import { IURL } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { SynchronizationMessageBody } from './message-body.interface';
import { MultiPolicy } from '@entity/multi-policy';

/**
 * Synchronization message
 */
export class SynchronizationMessage extends Message {
    /**
     * Language
     */
    public lang: string;
    /**
     * User DID
     */
    public user: string;
    /**
     * Policy ID (Topic ID)
     */
    public policy: string;
    /**
     * Policy Type
     */
    public policyType: string;
    /**
     * Message Id
     */
    public messageId: string;
    /**
     * Token Id
     */
    public tokenId: string;
    /**
     * Token amount
     */
    public amount: any;
    /**
     * Target Account
     */
    public target: string;
    /**
     * Memo
     */
    public memo: string;

    constructor(action: MessageAction) {
        super(action, MessageType.Synchronization);
    }

    /**
     * Set document
     */
    public setDocument(policy: MultiPolicy, data?: any): void {
        this.lang = 'en-US';
        this.user = policy.user;
        this.policy = policy.instanceTopicId;
        this.policyType = policy.type;
        if (data) {
            this.messageId = data.messageId;
            this.tokenId = data.tokenId;
            this.amount = data.amount;
            this.memo = data.memo;
            this.target = data.target;
        }
    }

    /**
     * To message object
     */
    public override toMessageObject(): SynchronizationMessageBody {
        const result: SynchronizationMessageBody = {
            id: this._id,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang
        };
        if (this.action === MessageAction.CreateMultiPolicy) {
            result.user = this.user;
            result.policy = this.policy;
            result.policyType = this.policyType;
        } else if (this.action === MessageAction.Mint) {
            result.user = this.user;
            result.policy = this.policy;
            result.policyType = this.policyType;
            result.messageId = this.messageId;
            result.tokenId = this.tokenId;
            result.amount = this.amount;
            result.memo = this.memo;
            result.target = this.target;
        }
        return result;
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

        if (json.type !== MessageType.Synchronization) {
            throw new Error('Invalid message type');
        }

        let message = new SynchronizationMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.lang = json.lang;
        message.user = json.user;
        message.policy = json.policy;
        message.policyType = json.policyType;
        message.messageId = json.messageId;
        message.tokenId = json.tokenId;
        message.amount = json.amount;
        message.memo = json.memo;
        message.target = json.target;
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
