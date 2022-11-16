import { Schema } from '@entity/schema';
import { Message } from './message';
import { IURL, UrlType } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { SchemaMessageBody } from './message-body.interface';
import { IPFS } from '@helpers/ipfs';

/**
 * Schema message
 */
export class SchemaMessage extends Message {
    /**
     * Name
     */
    public name: string;
    /**
     * Description
     */
    public description: string;
    /**
     * Entity
     */
    public entity: string;
    /**
     * Owner
     */
    public owner: string;
    /**
     * UUID
     */
    public uuid: string;
    /**
     * Version
     */
    public version: string;

    /**
     * Code Version
     */
    public codeVersion: string;

    /**
     * Documents
     */
    public documents: any[];

    constructor(action: MessageAction) {
        super(action, MessageType.Schema);
    }

    /**
     * Set document
     * @param schema
     */
    public setDocument(schema: Schema): void {
        this.name = schema.name;
        this.description = schema.description;
        this.entity = schema.entity;
        this.owner = schema.owner;
        this.uuid = schema.uuid;
        this.version = schema.version;
        const document = schema.document;
        const context = schema.context;
        this.documents = [document, context];
    }

    /**
     * Get document
     */
    public getDocument(): any {
        return this.documents[0];
    }

    /**
     * Get context
     */
    public getContext(): any {
        return this.documents[1];
    }

    /**
     * To message object
     */
    public override toMessageObject(): SchemaMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            name: this.name,
            description: this.description,
            entity: this.entity,
            owner: this.owner,
            uuid: this.uuid,
            version: this.version,
            document_cid: this.getDocumentUrl(UrlType.cid),
            document_uri: this.getDocumentUrl(UrlType.url),
            context_cid: this.getContextUrl(UrlType.cid),
            context_uri: this.getContextUrl(UrlType.url),
            codeVersion: this.codeVersion
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<ArrayBuffer[]> {
        if (this.action === MessageAction.PublishSchema ||
            this.action === MessageAction.PublishSystemSchema) {
            const result = new Array(this.documents.length);
            for (let i = 0; i < this.documents.length; i++) {
                const json = JSON.stringify(this.documents[i]);
                const buffer = Buffer.from(json);
                result[i] = buffer;
            }
            return result;
        }
        return [];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: string[]): SchemaMessage {
        if (documents && Array.isArray(documents)) {
            this.documents = documents.map(e => JSON.parse(e));
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): SchemaMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return SchemaMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: SchemaMessageBody): SchemaMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new SchemaMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.name = json.name;
        message.description = json.description;
        message.entity = json.entity;
        message.owner = json.owner;
        message.uuid = json.uuid;
        message.version = json.version;
        message.codeVersion = json.codeVersion;
        const urls = [{
            cid: json.document_cid,
            url: IPFS.IPFS_PROTOCOL + json.document_cid
        },
        {
            cid: json.context_cid,
            url: IPFS.IPFS_PROTOCOL + json.context_cid
        }];
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
}
