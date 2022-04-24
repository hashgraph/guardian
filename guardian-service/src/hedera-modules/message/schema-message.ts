
import { Schema } from '@entity/schema';
import { Message } from './message';
import { IURL, UrlType } from "./url.interface";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";
import { MessageBody, SchemaMessageBody } from './message-body.interface';

export class SchemaMessage extends Message {
    public name: string;
    public description: string;
    public entity: string;
    public owner: string;
    public uuid: string;
    public version: string;

    public documents: any[];

    constructor(action: MessageAction) {
        super(action, MessageType.Schema);
    }

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

    public getDocument(): any {
        return this.documents[0];
    }

    public getContext(): any {
        return this.documents[1];
    }

    public override toMessageObject(): SchemaMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            name: this.name,
            description: this.description,
            entity: this.entity,
            owner: this.owner,
            uuid: this.uuid,
            version: this.version,
            document_cid: this.getDocumentUrl(UrlType.cid),
            document_url: this.getDocumentUrl(UrlType.url),
            context_cid: this.getContextUrl(UrlType.cid),
            context_url: this.getContextUrl(UrlType.url)
        };
    }

    public async toDocuments(): Promise<ArrayBuffer[]> {
        if (this.action !== MessageAction.PublishSchema) {
            return [];
        }
        const result = new Array(this.documents.length);
        for (let i = 0; i < this.documents.length; i++) {
            const json = JSON.stringify(this.documents[i]);
            const buffer = Buffer.from(json);
            result[i] = buffer;
        }
        return result;
    }

    public loadDocuments(documents: string[]): SchemaMessage {
        if (documents && Array.isArray(documents)) {
            this.documents = documents.map(e => JSON.parse(e));
        }
        return this;
    }

    public static fromMessage(message: string): SchemaMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: SchemaMessageBody): SchemaMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const message = new SchemaMessage(json.action);
        message._id = json.id;
        message._status = json.status;
        message.name = json.name;
        message.description = json.description;
        message.entity = json.entity;
        message.owner = json.owner;
        message.uuid = json.uuid;
        message.version = json.version;
        const urls = [{
            cid: json.document_cid,
            url: json.document_url
        },
        {
            cid: json.context_cid,
            url: json.context_url
        }];
        message.setUrls(urls);
        return message;
    }

    public override getUrl(): IURL[] {
        return this.urls;
    }

    public getDocumentUrl(type: UrlType): string | null {
        return this.getUrlValue(0, type);
    }

    public getContextUrl(type: UrlType): string | null {
        return this.getUrlValue(1, type);
    }

    public override validate(): boolean {
        return true;
    }
}