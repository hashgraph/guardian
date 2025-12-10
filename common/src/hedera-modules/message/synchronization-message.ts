import { Message } from './message.js';
import { IURL } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { SynchronizationMessageBody } from './message-body.interface.js';
import { MultiPolicy } from '../../entity/index.js';
import { MultiPolicyType } from '@guardian/interfaces';

/**
 * Synchronization message
 */
export class SynchronizationMessage extends Message {
    /**
     * Language
     */
    declare public lang: string;
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
    public policyType: MultiPolicyType;
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
    /**
     * Policy Owner DID
     */
    public policyOwner: string;

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
        this.policyOwner = policy.policyOwner;
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
            lang: this.lang,
            account: this.account
        };
        if (this.action === MessageAction.CreateMultiPolicy) {
            result.user = this.user;
            result.policy = this.policy;
            result.policyType = this.policyType;
            result.policyOwner = this.policyOwner;
        } else if (this.action === MessageAction.Mint) {
            result.user = this.user;
            result.policy = this.policy;
            result.policyType = this.policyType;
            result.policyOwner = this.policyOwner;
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
    public async toDocuments(): Promise<Buffer[]> {
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
        message.account = json.account;
        message.user = json.user;
        message.policy = json.policy;
        message.policyType = json.policyType;
        message.messageId = json.messageId;
        message.tokenId = json.tokenId;
        message.amount = json.amount;
        message.memo = json.memo;
        message.target = json.target;
        message.policyOwner = json.policyOwner;
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

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.user = this.user;
        result.policy = this.policy;
        result.policyType = this.policyType;
        result.messageId = this.messageId;
        result.tokenId = this.tokenId;
        result.amount = this.amount;
        result.memo = this.memo;
        result.target = this.target;
        result.policyOwner = this.policyOwner;
        return result;
    }

    public static fromJson(json: any): SynchronizationMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new SynchronizationMessage(json.action), json);
        result.user = json.user;
        result.policy = json.policy;
        result.policyType = json.policyType;
        result.messageId = json.messageId;
        result.tokenId = json.tokenId;
        result.amount = json.amount;
        result.memo = json.memo;
        result.target = json.target;
        result.policyOwner = json.policyOwner;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.policyOwner;
    }
}
