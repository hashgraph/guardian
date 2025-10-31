import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { PolicyModule } from '../../entity/index.js';
import { ModuleMessageBody } from './message-body.interface.js';
import { IPFS, toBuffer } from '../../helpers/index.js';

/**
 * Module message
 */
export class ModuleMessage extends Message {
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
     * Module topic ID
     * @private
     */
    public moduleTopicId: string;

    constructor(type: MessageType.Module, action: MessageAction) {
        super(action, type);
        this._responseType = 'raw';
        this.setUrls([]);
    }

    /**
     * Set document
     * @param model
     * @param zip
     */
    public setDocument(model: PolicyModule, zip?: ArrayBuffer | Buffer): void {
        this.uuid = model.uuid;
        this.name = model.name;
        this.description = model.description;
        this.owner = model.owner;
        this.document = toBuffer(zip);
        this.moduleTopicId = model.topicId;
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
    public override toMessageObject(): ModuleMessageBody {
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
            topicId: this.moduleTopicId?.toString(),
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
    public loadDocuments(documents: any[]): ModuleMessage {
        if (documents && documents.length === 1) {
            this.document = Buffer.from(documents[0]);
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): ModuleMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return ModuleMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: ModuleMessageBody): ModuleMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.Module) {
            throw new Error('Invalid message type')
        }

        let message = new ModuleMessage(json.type, json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.uuid = json.uuid;
        message.name = json.name;
        message.description = json.description;
        message.owner = json.owner;
        message.moduleTopicId = json.topicId;

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
        result.document = this.document;
        result.moduleTopicId = this.moduleTopicId;
        return result;
    }

    public static fromJson(json: any): ModuleMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new ModuleMessage(json.type, json.action), json);
        result.uuid = json.uuid;
        result.name = json.name;
        result.description = json.description;
        result.owner = json.owner;
        result.document = json.document;
        result.moduleTopicId = json.moduleTopicId;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.owner;
    }
}
