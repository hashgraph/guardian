import { Policy } from '../../entity/index.js';
import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { PolicyMessageBody } from './message-body.interface.js';
import { IPFS, toBuffer } from '../../helpers/index.js';

/**
 * Policy message
 */
export class PolicyMessage extends Message {
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
     * Topic description
     */
    public topicDescription: string;
    /**
     * Version
     */
    public version: string;
    /**
     * policyTag
     */
    public policyTag: string;
    /**
     * Owner
     */
    public owner: string;
    /**
     * Instance topic ID
     */
    public instanceTopicId: string;
    /**
     * Synchronization topic ID
     */
    public synchronizationTopicId: string;
    /**
     * Policy topic ID
     */
    public policyTopicId: string;
    /**
     * Discontinued date
     */
    public discontinuedDate?: Date;
    /**
     * Availability
     */
    public availability: string;
    /**
     * Restore Topic Id
     */
    public restoreTopicId: string;
    /**
     * Actions Topic Id
     */
    public actionsTopicId: string;
    /**
     * Records Topic Id
     */
    public recordsTopicId: string;

    /**
     * Comments Topic Id
     */
    public commentsTopicId: string;

    constructor(type: MessageType.Policy | MessageType.InstancePolicy, action: MessageAction) {
        super(action, type);
        this._responseType = 'raw';
        this.setUrls([]);
    }

    /**
     * Set document
     * @param model
     * @param zip
     */
    public setDocument(model: Policy, zip?: ArrayBuffer | Buffer): void {
        this.uuid = model.uuid;
        this.name = model.name;
        this.description = model.description;
        this.topicDescription = model.topicDescription;
        this.version = model.version;
        this.policyTag = model.policyTag;
        this.owner = model.owner;
        this.policyTopicId = model.topicId;
        this.instanceTopicId = model.instanceTopicId;
        this.synchronizationTopicId = model.synchronizationTopicId;
        this.discontinuedDate = model.discontinuedDate;
        this.availability = model.availability;
        this.restoreTopicId = model.restoreTopicId;
        this.actionsTopicId = model.actionsTopicId;
        this.recordsTopicId = model.recordsTopicId;
        this.commentsTopicId = model.commentsTopicId;
        this.document = toBuffer(zip);
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
    public override toMessageObject(): PolicyMessageBody {
        const messageObject: any = {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            uuid: this.uuid,
            name: this.name,
            description: this.description,
            topicDescription: this.topicDescription,
            version: this.version,
            policyTag: this.policyTag,
            owner: this.owner,
            topicId: this.policyTopicId?.toString(),
            instanceTopicId: this.instanceTopicId,
            synchronizationTopicId: this.synchronizationTopicId,
            availability: this.availability,
            restoreTopicId: this.restoreTopicId,
            actionsTopicId: this.actionsTopicId,
            recordsTopicId: this.recordsTopicId,
            commentsTopicId: this.commentsTopicId,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url)
        };
        if ([MessageAction.DeferredDiscontinuePolicy, MessageAction.DiscontinuePolicy].includes(this.action)) {
            messageObject.effectiveDate = this.discontinuedDate?.toISOString();
        }
        return this.limit(messageObject);
    }

    private cut(text: string, size: number): string {
        if (!text) {
            return text;
        }
        if (text.length <= 40) {
            return text;
        }
        return text.slice(0, Math.max(text.length - size, 40) - 3) + '...';
    }

    private limit(json: PolicyMessageBody): PolicyMessageBody {
        const LIMIT = 950;
        const fields = ['topicDescription', 'description', 'name', 'policyTag'];
        let text: string;
        for (const field of fields) {
            text = JSON.stringify(json);
            if (text.length > LIMIT) {
                json[field] = this.cut(json[field], text.length - LIMIT);
            } else {
                return json;
            }
        }
        return json;
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<Buffer[]> {
        if (this.action !== MessageAction.PublishPolicy) {
            return [];
        }
        if (this.document) {
            return [this.document];
        }
        return [];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: any[]): PolicyMessage {
        if (documents && documents.length === 1) {
            this.document = Buffer.from(documents[0]) as any;
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): PolicyMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return PolicyMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: PolicyMessageBody): PolicyMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.Policy && json.type !== MessageType.InstancePolicy) {
            throw new Error('Invalid message type')
        }

        let message = new PolicyMessage(json.type, json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.uuid = json.uuid;
        message.name = json.name;
        message.description = json.description;
        message.topicDescription = json.topicDescription;
        message.version = json.version;
        message.policyTag = json.policyTag;
        message.owner = json.owner;
        message.policyTopicId = json.topicId;
        message.instanceTopicId = json.instanceTopicId;
        message.synchronizationTopicId = json.synchronizationTopicId;
        message.availability = json.availability;
        message.restoreTopicId = json.restoreTopicId;
        message.actionsTopicId = json.actionsTopicId;
        message.recordsTopicId = json.recordsTopicId;
        message.commentsTopicId = json.commentsTopicId;
        if ([MessageAction.DeferredDiscontinuePolicy, MessageAction.DiscontinuePolicy].includes(json.action)
            && json.effectiveDate) {
            message.discontinuedDate = new Date(json.effectiveDate)
        }

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
        result.topicDescription = this.topicDescription;
        result.version = this.version;
        result.policyTag = this.policyTag;
        result.policyTopicId = this.policyTopicId;
        result.instanceTopicId = this.instanceTopicId;
        result.synchronizationTopicId = this.synchronizationTopicId;
        result.availability = this.availability;
        result.restoreTopicId = this.restoreTopicId;
        result.actionsTopicId = this.actionsTopicId;
        result.recordsTopicId = this.recordsTopicId;
        result.commentsTopicId = this.commentsTopicId;
        if ([MessageAction.DeferredDiscontinuePolicy, MessageAction.DiscontinuePolicy].includes(this.action)) {
            result.effectiveDate = this.discontinuedDate;
        }
        result.document = this.document;
        return result;
    }

    public static fromJson(json: any): PolicyMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new PolicyMessage(json.type, json.action), json);
        result.uuid = json.uuid;
        result.name = json.name;
        result.description = json.description;
        result.owner = json.owner;
        result.topicDescription = json.topicDescription;
        result.version = json.version;
        result.policyTag = json.policyTag;
        result.policyTopicId = json.policyTopicId;
        result.instanceTopicId = json.instanceTopicId;
        result.synchronizationTopicId = json.synchronizationTopicId;
        result.availability = json.availability;
        result.restoreTopicId = json.restoreTopicId;
        result.actionsTopicId = json.actionsTopicId;
        result.recordsTopicId = json.recordsTopicId;
        result.commentsTopicId = json.commentsTopicId;
        result.discontinuedDate = json.effectiveDate;
        result.document = json.document;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.owner;
    }
}
