
import { Schema } from '@entity/schema';
import { Message } from './message';
import { IURL } from "./i-url";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";

export class SchemaMessage extends Message {
    public name: string;
    public description: string;
    public entity: string;
    public owner: string;
    public uuid: string;
    public version: string;

    public documents: any[];

    constructor(action: MessageAction) {
        super(action, MessageType.SchemaDocument);
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

    public getDocument(): string {
        return this.documents[0];
    }

    public getContext(): string {
        return this.documents[1];
    }

    public toMessage(): string {
        return JSON.stringify({
            action: this.action,
            type: this.type,
            name: this.name,
            description: this.description,
            entity: this.entity,
            owner: this.owner,
            uuid: this.uuid,
            version: this.version,
            document_cid: this.urls[0].cid,
            document_url: this.urls[0].url,
            context_cid: this.urls[1].cid,
            context_url: this.urls[1].url
        });
    }

    public async toDocuments(): Promise<ArrayBuffer[]> {
        const result = new Array(this.documents.length);
        for (let i = 0; i < this.documents.length; i++) {
            const json = JSON.stringify(this.documents[i]);
            const buffer = Buffer.from(json);
            result[i] = buffer;
        }
        return result;
    }

    public loadDocuments(documents: string[]): SchemaMessage {
        this.documents = documents.map(e => JSON.parse(e));
        return this;
    }

    public static fromMessage(message: string): SchemaMessage {
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: any): SchemaMessage {
        const message = new SchemaMessage(json.action);
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
        }]
        message.setUrls(urls);
        return message;
    }

    public override getUrl(): IURL[] {
        return this.urls;
    }

    public getDocumentUrl(): IURL {
        return this.urls[0];
    }

    public getContextUrl(): IURL {
        return this.urls[1];
    }
}