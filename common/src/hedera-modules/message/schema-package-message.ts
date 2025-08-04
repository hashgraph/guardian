import { Schema } from '../../entity/index.js';
import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { SchemaPackageMessageBody } from './message-body.interface.js';

/**
 * Schema message
 */
export class SchemaPackageMessage extends Message {
    /**
     * Name
     */
    public name: string;
    /**
     * Owner
     */
    public owner: string;
    /**
     * Version
     */
    public version: string;
    /**
     * Documents
     */
    public documents: any[];

    /**
     * Relationships
     */
    public relationships: string[];

    constructor(action: MessageAction) {
        super(action, MessageType.Schema);
    }

    /**
     * Set document
     * @param schema
     */
    public setDocument(packageDocuments: any): void {
        this.name = packageDocuments.name;
        this.owner = packageDocuments.owner;
        this.version = packageDocuments.version;
        const document = packageDocuments.document;
        const context = packageDocuments.context;
        this.documents = [document, context];
    }

    public setRelationships(relationships: Schema[]): void {
        this.relationships = [];
        for (const relationship of relationships) {
            if (relationship.messageId) {
                this.relationships.push(relationship.messageId);
            }
        }
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
    public override toMessageObject(): SchemaPackageMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            name: this.name,
            owner: this.owner,
            version: this.version,
            relationships: this.relationships,
            document_cid: this.getDocumentUrl(UrlType.cid),
            document_uri: this.getDocumentUrl(UrlType.url),
            context_cid: this.getContextUrl(UrlType.cid),
            context_uri: this.getContextUrl(UrlType.url),
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<ArrayBuffer[]> {
        if (
            this.action === MessageAction.PublishSchema ||
            this.action === MessageAction.PublishSystemSchema
        ) {
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
    public loadDocuments(documents: string[]): SchemaPackageMessage {
        if (documents && Array.isArray(documents)) {
            this.documents = documents.map(e => JSON.parse(e));
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): SchemaPackageMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return SchemaPackageMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: SchemaPackageMessageBody): SchemaPackageMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new SchemaPackageMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.name = json.name;
        message.owner = json.owner;
        message.version = json.version;
        message.relationships = json.relationships;
        const urls = [{
            cid: json.document_cid,
            url: json.document_url || json.document_uri
        },
        {
            cid: json.context_cid,
            url: json.context_url || json.context_uri
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

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.name = this.name;
        result.owner = this.owner;
        result.version = this.version;
        result.relationships = this.relationships;
        result.documentUrl = this.getDocumentUrl(UrlType.url);
        result.contextUrl = this.getContextUrl(UrlType.url);
        if (this.documents) {
            result.document = this.documents[0];
            result.context = this.documents[1];
        }
        return result;
    }

    public static fromJson(json: any): SchemaPackageMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new SchemaPackageMessage(json.action), json);
        result.name = json.name;
        result.owner = json.owner;
        result.version = json.version;
        result.relationships = json.relationships;
        result.documents = [json.document, json.context];
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.owner;
    }
}
