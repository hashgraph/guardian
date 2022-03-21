
import { Schema } from '@entity/schema';
import { Message, MessageType } from './message';

export class SchemaMessage extends Message {
    public name: string;
    public description: string;
    public entity: string;
    public owner: string;
    public uuid: string;
    public version: string;

    public documents: string[];

    constructor(action: string) {
        super(action, MessageType.SchemaDocument);
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
            context_url: this.urls[1].url,
        });
    }

    public toDocuments(): string[] {
        return this.documents;
    }

    public loadDocuments(documents: string[]): SchemaMessage {
        this.documents = documents;
        return this;
    }

    public setData(schema: Schema): void {
        this.name = schema.name;
        this.description = schema.description;
        this.entity = schema.entity;
        this.owner = schema.owner;
        this.uuid = schema.uuid;
        this.version = schema.version;


    }

    public static fromMessage(message: string): SchemaMessage {
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: any): SchemaMessage {
        const message = new SchemaMessage(json.action);
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
}
