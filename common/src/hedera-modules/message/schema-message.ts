import { Schema } from '../../entity/index.js';
import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { SchemaMessageBody } from './message-body.interface.js';

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
    public setDocument(schema: Schema): void {
        this.name = schema.name;
        this.description = schema.description;
        this.entity = schema.entity;
        this.owner = schema.owner;
        this.uuid = schema.uuid;
        this.version = schema.version;
        this.codeVersion = schema.codeVersion;
        const document = schema.document;
        const context = schema.context;
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
    public override toMessageObject(): SchemaMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            name: this.name,
            description: this.description,
            entity: this.entity,
            owner: this.owner,
            uuid: this.uuid,
            version: this.version,
            relationships: this.relationships,
            document_cid: this.getDocumentUrl(UrlType.cid),
            document_uri: this.getDocumentUrl(UrlType.url),
            context_cid: this.getContextUrl(UrlType.cid),
            context_uri: this.getContextUrl(UrlType.url),
            code_version: this.codeVersion
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<Buffer[]> {
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
        message.codeVersion = json.code_version;
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
        result.description = this.description;
        result.entity = this.entity;
        result.owner = this.owner;
        result.uuid = this.uuid;
        result.version = this.version;
        result.codeVersion = this.codeVersion;
        result.relationships = this.relationships;
        result.documentUrl = this.getDocumentUrl(UrlType.url);
        result.contextUrl = this.getContextUrl(UrlType.url);
        if (this.documents) {
            result.document = this.documents[0];
            result.context = this.documents[1];
        }
        return result;
    }

    public static fromJson(json: any): SchemaMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new SchemaMessage(json.action), json);
        result.name = json.name;
        result.description = json.description;
        result.entity = json.entity;
        result.owner = json.owner;
        result.uuid = json.uuid;
        result.version = json.version;
        result.codeVersion = json.codeVersion;
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
