import { Schema } from '../../entity/index.js';
import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { SchemaPackageMessageBody } from './message-body.interface.js';

interface IMetadata {
    schemas: {
        id: string,
        uuid: string,
        name: string,
        description: string,
        entity: string,
        owner: string,
        version: string,
        codeVersion: string,
    }[],
    relationships: string[]
}

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
     * Schemas count
     */
    public schemas: number;
    /**
     * Documents
     */
    public documents: any[];

    private document: any;
    private context: any;
    private metadata: IMetadata;

    constructor(action: MessageAction) {
        super(action, MessageType.SchemaPackage);
    }

    /**
     * Set document
     * @param schema
     */
    public setDocument(packageDocuments: {
        name: string,
        owner: string,
        version: string,
        document: any,
        context: any
    }): void {
        this.name = packageDocuments.name;
        this.owner = packageDocuments.owner;
        this.version = packageDocuments.version;

        this.document = packageDocuments.document;
        this.context = packageDocuments.context;
        this.documents = [this.document, this.context, this.metadata];
    }

    public setMetadata(
        schemas: Schema[],
        relationships: Schema[]
    ): void {
        const metadata: any[] = [];
        const ids = new Set<string>();
        if (schemas) {
            for (const schema of schemas) {
                metadata.push({
                    id: schema.iri,
                    uuid: schema.uuid,
                    name: schema.name,
                    description: schema.description,
                    entity: schema.entity,
                    owner: schema.owner,
                    version: schema.version,
                    codeVersion: schema.codeVersion
                })
            }
        }
        if (relationships) {
            for (const schema of relationships) {
                if (schema.messageId) {
                    ids.add(schema.messageId);
                }
            }
        }
        this.metadata = {
            schemas: metadata,
            relationships: Array.from(ids)
        };
        this.documents = [this.document, this.context, this.metadata];
        this.schemas = metadata.length;
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
     * Get context
     */
    public getMetadata(): IMetadata | undefined {
        return this.documents[2];
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
            account: this.account,
            name: this.name,
            owner: this.owner,
            version: this.version,
            schemas: this.schemas,
            document_cid: this.getDocumentUrl(UrlType.cid),
            document_uri: this.getDocumentUrl(UrlType.url),
            context_cid: this.getContextUrl(UrlType.cid),
            context_uri: this.getContextUrl(UrlType.url),
            metadata_cid: this.getMetadataUrl(UrlType.cid),
            metadata_uri: this.getMetadataUrl(UrlType.url),
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<Buffer[]> {
        if (
            this.action === MessageAction.PublishSchemas ||
            this.action === MessageAction.PublishSystemSchemas
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
        message.schemas = json.schemas;
        const urls = [{
            cid: json.document_cid,
            url: json.document_url || json.document_uri
        },
        {
            cid: json.context_cid,
            url: json.context_url || json.context_uri
        },
        {
            cid: json.metadata_cid,
            url: json.metadata_url || json.metadata_uri
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
     * Get context URL
     * @param type
     */
    public getMetadataUrl(type: UrlType): string | null {
        return this.getUrlValue(2, type);
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
        result.schemas = this.schemas;
        result.documentUrl = this.getDocumentUrl(UrlType.url);
        result.contextUrl = this.getContextUrl(UrlType.url);
        result.metadataUrl = this.getMetadataUrl(UrlType.url);
        if (this.documents) {
            result.document = this.documents[0];
            result.context = this.documents[1];
            result.metadata = this.documents[2];
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
        result.schemas = json.schemas;
        result.documents = [
            json.document,
            json.context,
            json.metadata
        ];
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.owner;
    }
}
