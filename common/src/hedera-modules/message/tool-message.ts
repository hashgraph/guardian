import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { ToolMessageBody } from './message-body.interface.js';
import { IPFS, toBuffer } from '../../helpers/index.js';
import { PolicyTool } from '../../entity/tool.js';

/**
 * Tool message
 */
export class ToolMessage extends Message {
    /**
     * Document
     */
    public document: Buffer;
    /**
     * UUID
     */
    public uuid: string;
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
     * Hash
     */
    public hash: string;
    /**
     * Tool topic ID
     * @private
     */
    public toolTopicId: string;
    /**
     * Tags topic ID
     */
    public tagsTopicId: string;
    /**
     * Version
     */
    public version: string;

    constructor(type: MessageType.Tool, action: MessageAction) {
        super(action, type);
        this._responseType = 'raw';
        this.setUrls([]);
    }

    /**
     * Set document
     * @param model
     * @param zip
     */
    public setDocument(model: PolicyTool, zip?: ArrayBuffer | Buffer): void {
        this.uuid = model.uuid;
        this.name = model.name;
        this.description = model.description;
        this.owner = model.owner;
        this.hash = model.hash;
        this.document = toBuffer(zip);
        this.toolTopicId = model.topicId;
        this.tagsTopicId = model.tagsTopicId;
        this.version = model.version;
    }

    /**
     * Get document
     */
    public getDocument(): Buffer {
        return this.document;
    }

    /**
     * To message object
     */
    public override toMessageObject(): ToolMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            uuid: this.uuid,
            name: this.name,
            description: this.description,
            owner: this.owner,
            hash: this.hash,
            topicId: this.toolTopicId?.toString(),
            tagsTopicId: this.tagsTopicId,
            version: this.version,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url)
        }
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<Buffer[]> {
        if (this.document) {
            return [this.document];
        }
        return [];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: any[]): ToolMessage {
        if (documents && documents.length === 1) {
            this.document = Buffer.from(documents[0]) as any;
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): ToolMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return ToolMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: ToolMessageBody): ToolMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.Tool) {
            throw new Error('Invalid message type')
        }

        let message = new ToolMessage(json.type, json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.uuid = json.uuid;
        message.name = json.name;
        message.description = json.description;
        message.owner = json.owner;
        message.hash = json.hash;
        message.toolTopicId = json.topicId;
        message.tagsTopicId = json.tagsTopicId;
        message.version = json.version;

        if (json.cid) {
            const urls = [{
                cid: json.cid,
                url: IPFS.IPFS_PROTOCOL + json.cid
            }];
            message.setUrls(urls);
        } else {
            const urls = [];
            message.setUrls(urls);
        }
        return message;
    }

    /**
     * Get URL
     */
    public override getUrl(): IURL {
        return this.getUrls()[0];
    }

    /**
     * Validation
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
        result.name = this.name;
        result.description = this.description;
        result.owner = this.owner;
        result.hash = this.hash;
        result.document = this.document;
        result.toolTopicId = this.toolTopicId;
        result.tagsTopicId = this.tagsTopicId;
        result.version = this.version;
        return result;
    }

    public static fromJson(json: any): ToolMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new ToolMessage(json.type, json.action), json);
        result.uuid = json.uuid;
        result.name = json.name;
        result.description = json.description;
        result.owner = json.owner;
        result.hash = json.hash;
        result.document = json.document;
        result.toolTopicId = json.toolTopicId;
        result.tagsTopicId = json.tagsTopicId;
        result.version = json.version;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.owner;
    }
}
