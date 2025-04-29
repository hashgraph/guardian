import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { PolicyActionMessageBody } from './message-body.interface.js';
import { IPFS } from '../../helpers/index.js';
import { ITopicMessage } from '../../topic-listener/topic-listener.js';
import { PolicyAction } from '../../entity/index.js';

/**
 * Policy action message
 */
export class PolicyActionMessage extends Message {
    /**
     * Document
     */
    public document: any;
    /**
     * UUID
     */
    public uuid: string;
    /**
     * Owner
     */
    public owner: string;
    /**
     * Policy
     */
    public policyId: string;
    /**
     * User account
     */
    public accountId: string;
    /**
     * Block
     */
    public blockTag: string;
    /**
     * Parent message
     */
    public parent: string;

    constructor(action: MessageAction) {
        super(action, MessageType.PolicyAction);
    }

    /**
     * Set document
     * @param model
     * @param zip
     */
    public setDocument(action: PolicyAction, data: any): void {
        this.uuid = action.uuid;
        this.owner = action.owner;
        this.policyId = action.policyId;
        this.accountId = action.accountId;
        this.blockTag = action.blockTag;
        this.parent = action.startMessageId;
        this.document = data;
    }

    /**
     * Get document
     */
    public getDocument(): any {
        return this.document;
    }

    /**
     * To message object
     */
    public override toMessageObject(): PolicyActionMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            uuid: this.uuid,
            owner: this.owner,
            policyId: this.policyId,
            accountId: this.accountId,
            blockTag: this.blockTag,
            parent: this.parent,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url),
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<ArrayBuffer[]> {
        const json = JSON.stringify(this.document);
        const buffer = Buffer.from(json);
        return [buffer];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: string[]): any {
        this.document = JSON.parse(documents[0]);
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): PolicyActionMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return PolicyActionMessage.fromMessageObject(json);
    }

    /**
     * From message
     * @param message
     */
    public static from(data: ITopicMessage): PolicyActionMessage {
        if (!data) {
            throw new Error('Message Object is empty');
        }
        if (!data.message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(data.message);
        const message = PolicyActionMessage.fromMessageObject(json);
        message.setAccount(data.owner);
        message.setIndex(data.sequenceNumber);
        message.setId(data.consensusTimestamp);
        message.setTopicId(data.topicId);
        return message;
    }

    /**
     * From message objects
     * @param json
     */
    public static fromMessageObject(json: PolicyActionMessageBody): PolicyActionMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new PolicyActionMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.uuid = json.uuid;
        message.owner = json.owner;
        message.policyId = json.policyId;
        message.accountId = json.accountId;
        message.blockTag = json.blockTag;
        message.parent = json.parent;

        const urls = [{
            cid: json.cid,
            url: IPFS.IPFS_PROTOCOL + json.cid
        }]
        message.setUrls(urls);
        return message;
    }

    /**
     * Get URL
     */
    public override getUrl(): IURL {
        return this.getUrls()[0];
    }

    /**
     * Validate
     */
    public override validate(): boolean {
        return true;
    }

    /**
     * Get document URL
     * @param type
     */
    public getDocumentUrl(type: UrlType): string | null {
        return this.getUrlValue(0, type);
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.uuid = this.uuid;
        result.owner = this.owner;
        result.policyId = this.policyId;
        result.accountId = this.accountId;
        result.blockTag = this.blockTag;
        result.parent = this.parent;
        result.document = this.document;
        return result;
    }

    public static fromJson(json: any): PolicyActionMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new PolicyActionMessage(json.action), json);
        result.uuid = json.uuid;
        result.owner = json.owner;
        result.policyId = json.policyId;
        result.accountId = json.accountId;
        result.blockTag = json.blockTag;
        result.parent = json.parent;
        result.document = json.document;
        return result;
    }
}