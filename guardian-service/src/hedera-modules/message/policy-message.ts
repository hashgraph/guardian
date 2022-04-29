import { Policy } from '@entity/policy';
import { Message } from './message';
import { IURL, UrlType } from "./url.interface";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";
import { MessageBody, PolicyMessageBody } from './message-body.interface';

export class PolicyMessage extends Message {
    public document: ArrayBuffer;

    public uuid: string;
    public name: string;
    public description: string;
    public topicDescription: string;
    public version: string;
    public policyTag: string;
    public owner: string;
    public instanceTopicId: string;

    constructor(type: MessageType.Policy | MessageType.InstancePolicy, action: MessageAction) {
        super(action, type);
        this._responseType = "raw";
        this.urls = [];
    }

    public setDocument(model: Policy, zip?: ArrayBuffer): void {
        this.uuid = model.uuid;
        this.name = model.name;
        this.description = model.description;
        this.topicDescription = model.topicDescription;
        this.version = model.version;
        this.policyTag = model.policyTag;
        this.owner = model.owner;
        this.topicId = model.topicId;
        this.instanceTopicId = model.instanceTopicId;
        this.document = zip;
    }

    public getDocument(): ArrayBuffer {
        return this.document;
    }

    public override toMessageObject(): PolicyMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            uuid: this.uuid,
            name: this.name,
            description: this.description,
            topicDescription: this.topicDescription,
            version: this.version,
            policyTag: this.policyTag,
            owner: this.owner,
            topicId: this.topicId.toString(),
            instanceTopicId: this.instanceTopicId,
            cid: this.getDocumentUrl(UrlType.cid),
            url: this.getDocumentUrl(UrlType.url),
        }
    }

    public async toDocuments(): Promise<ArrayBuffer[]> {
        if (this.action !== MessageAction.PublishPolicy) {
            return [];
        }
        if (this.document) {
            return [this.document];
        }
        return [];
    }

    public loadDocuments(documents: any[]): PolicyMessage {
        if (documents && documents.length == 1) {
            this.document = Buffer.from(documents[0]);
        }
        return this;
    }

    public static fromMessage(message: string): PolicyMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: PolicyMessageBody): PolicyMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type != MessageType.Policy && json.type != MessageType.InstancePolicy) {
            throw 'Invalid message type'
        }

        const message = new PolicyMessage(json.type, json.action);
        message._id = json.id;
        message._status = json.status;
        message.uuid = json.uuid;
        message.name = json.name;
        message.description = json.description;
        message.topicDescription = json.topicDescription;
        message.version = json.version;
        message.policyTag = json.policyTag;
        message.policyTag = json.owner;
        message.topicId = json.topicId;
        message.instanceTopicId = json.instanceTopicId;

        if (json.cid && json.url) {
            const urls = [{
                cid: json.cid,
                url: json.url
            }];
            message.setUrls(urls);
        } else {
            const urls = [];
            message.setUrls(urls);
        }
        return message;
    }

    public override getUrl(): IURL {
        return this.urls[0];
    }

    public override validate(): boolean {
        return true;
    }

    public getDocumentUrl(type: UrlType): string | null {
        return this.getUrlValue(0, type);
    }
}
