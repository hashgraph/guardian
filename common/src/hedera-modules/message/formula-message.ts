import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { FormulaMessageBody } from './message-body.interface.js';
import { Formula } from '../../entity/index.js';
import { IPFS } from '../../helpers/index.js';

/**
 * Formula message
 */
export class FormulaMessage extends Message {
    /**
     * Name
     */
    public name: string;
    /**
     * Description
     */
    public description: string;
    /**
     * Owner
     */
    public owner: string;
    /**
     * UUID
     */
    public uuid: string;
    /**
     * Policy topic id
     */
    public policyTopicId: string;
    /**
     * Policy Instance topic id
     */
    public policyInstanceTopicId: string;

    /**
     * Document
     */
    public config: ArrayBuffer;

    constructor(action: MessageAction) {
        super(action, MessageType.Formula);
    }

    /**
     * Set document
     * @param item
     */
    public setDocument(item: Formula, zip: ArrayBuffer): void {
        this.name = item.name;
        this.description = item.description;
        this.owner = item.owner;
        this.uuid = item.uuid;
        this.policyTopicId = item.policyTopicId;
        this.policyInstanceTopicId = item.policyInstanceTopicId;
        this.config = zip;
    }

    /**
     * Get document
     */
    public getDocument(): ArrayBuffer {
        return this.config;
    }

    /**
     * To message object
     */
    public override toMessageObject(): FormulaMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            name: this.name,
            description: this.description,
            owner: this.owner,
            uuid: this.uuid,
            policyTopicId: this.policyTopicId,
            policyInstanceTopicId: this.policyInstanceTopicId,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url),
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<ArrayBuffer[]> {
        if (this.config) {
            return [this.config];
        }
        return [];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: string[]): FormulaMessage {
        if (documents && documents.length === 1) {
            this.config = Buffer.from(documents[0]);
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): FormulaMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return FormulaMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: FormulaMessageBody): FormulaMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new FormulaMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.name = json.name;
        message.description = json.description;
        message.owner = json.owner;
        message.uuid = json.uuid;
        message.policyTopicId = json.policyTopicId;
        message.policyInstanceTopicId = json.policyInstanceTopicId;
        const urls = [
            {
                cid: json.cid,
                url: IPFS.IPFS_PROTOCOL + json.cid,
            },
        ];
        message.setUrls(urls);
        return message;
    }

    /**
     * Get URL
     */
    public override getUrl(): IURL[] {
        return this.getUrls();
    }

    /**
     * Get document URL
     * @param type
     */
    public getDocumentUrl(type: UrlType): string | null {
        return this.getUrlValue(0, type);
    }

    /**
     * Get context URL
     * @param type
     */
    public getContextUrl(type: UrlType): string | null {
        return this.getUrlValue(1, type);
    }

    /**
     * Validate
     */
    public override validate(): boolean {
        return true;
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.name = this.name;
        result.description = this.description;
        result.owner = this.owner;
        result.uuid = this.uuid;
        result.policyTopicId = this.policyTopicId;
        result.policyInstanceTopicId = this.policyInstanceTopicId;
        result.config = this.config;
    }

    public static fromJson(json: any): FormulaMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new FormulaMessage(json.action), json);
        result.name = json.name;
        result.description = json.description;
        result.owner = json.owner;
        result.uuid = json.uuid;
        result.policyTopicId = json.policyTopicId;
        result.policyInstanceTopicId = json.policyInstanceTopicId;
        result.config = json.config;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.owner;
    }
}
