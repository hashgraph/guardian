import { Policy } from '@entity/policy';
import { Message } from './message';
import { IURL } from "./i-url";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";

export class PolicyMessage extends Message {
    public document: ArrayBuffer;

    public uuid: string;
    public name: string;
    public description: string;
    public topicDescription: string;
    public version: string;
    public policyTag: string;
    public owner: string;

    constructor(action: MessageAction) {
        super(action, MessageType.PolicyDocument);
        this._responseType = "raw";
    }

    public setDocument(model: Policy, zip: ArrayBuffer): void {
        this.uuid = model.uuid;
        this.name = model.name;
        this.description = model.description;
        this.topicDescription = model.topicDescription;
        this.version = model.version;
        this.policyTag = model.policyTag;
        this.owner = model.owner;
        this.document = zip;
    }

    public getDocument(): ArrayBuffer {
        return this.document;
    }

    public toMessage(): string {
        return JSON.stringify({
            action: this.action,
            type: this.type,
            uuid: this.uuid,
            name: this.name,
            description: this.description,
            topicDescription: this.topicDescription,
            version: this.version,
            policyTag: this.policyTag,
            owner: this.owner,
            cid: this.urls[0].cid,
            url: this.urls[0].url
        });
    }

    public async toDocuments(): Promise<ArrayBuffer[]> {
        return [this.document];
    }

    public loadDocuments(documents: any[]): PolicyMessage {
        this.document = Buffer.from(documents[0]);
        return this;
    }

    public setData(vc: any): void {
        this.document = vc;
    }

    public static fromMessage(message: string): PolicyMessage {
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: any): PolicyMessage {
        const message = new PolicyMessage(json.action);
        const urls = [{
            cid: json.cid,
            url: json.url
        }]
        message.setUrls(urls);
        return message;
    }

    public override getUrl(): IURL {
        return this.urls[0];
    }
}
