import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { IPFS, toBuffer } from '../../helpers/index.js';

/**
 * Policy record step message
 */
export class PolicyRecordMessage extends Message {
    public policyId: string;
    public policyMessageId: string | null;
    public recordingUuid: string;
    public recordId: string;
    public recordActionId: string;
    public method: string;
    public actionName: string | null;
    public time: number;
    public user: string | null;
    public target: string | null;
    public document: Buffer;

    constructor(action: MessageAction = MessageAction.PolicyRecordStep) {
        super(action, MessageType.PolicyRecordStep);
        this._responseType = 'raw';
        this.setUrls([]);
    }

    /**
     * Set document
     * @param model
     * @param zip
     */
    public setDocument(model: {
        policyId: string,
        policyMessageId?: string | null,
        recordingUuid: string,
        recordId: string,
        recordActionId: string,
        method: string,
        action?: string | null,
        time: number,
        user?: string | null,
        target?: string | null
    }, zip?: ArrayBuffer | Buffer): void {
        this.policyId = model.policyId;
        this.policyMessageId = model.policyMessageId ?? null;
        this.recordingUuid = model.recordingUuid;
        this.recordId = model.recordId;
        this.recordActionId = model.recordActionId;
        this.method = model.method;
        this.actionName = model.action ?? null;
        this.time = model.time;
        this.user = model.user ?? null;
        this.target = model.target ?? null;
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
    public override toMessageObject(): any {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            policyId: this.policyId,
            policyMessageId: this.policyMessageId,
            recordingUuid: this.recordingUuid,
            recordId: this.recordId,
            recordActionId: this.recordActionId,
            method: this.method,
            actionName: this.actionName,
            time: this.time,
            user: this.user,
            target: this.target,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url),
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<Buffer[]> {
        if (this.document) {
            return [this.document];
        }
        return [];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: any[]): PolicyRecordMessage {
        if (documents && documents.length === 1) {
            this.document = Buffer.from(documents[0]) as any;
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): PolicyRecordMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return PolicyRecordMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: any): PolicyRecordMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }
        if (json.type !== MessageType.PolicyRecordStep) {
            throw new Error('Invalid message type');
        }

        let message = new PolicyRecordMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.policyId = json.policyId;
        message.policyMessageId = json.policyMessageId ?? null;
        message.recordingUuid = json.recordingUuid;
        message.recordId = json.recordId;
        message.recordActionId = json.recordActionId;
        message.method = json.method;
        message.actionName = json.actionName ?? null;
        message.time = json.time;
        message.user = json.user ?? null;
        message.target = json.target ?? null;

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
        return !!(this.policyId && this.recordingUuid && this.recordId && this.recordActionId);
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
        result.policyId = this.policyId;
        result.policyMessageId = this.policyMessageId;
        result.recordingUuid = this.recordingUuid;
        result.recordId = this.recordId;
        result.recordActionId = this.recordActionId;
        result.method = this.method;
        result.actionName = this.actionName;
        result.time = this.time;
        result.user = this.user;
        result.target = this.target;
        result.document = this.document;
        return result;
    }

    public static fromJson(json: any): PolicyRecordMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new PolicyRecordMessage(json.action), json);
        result.policyId = json.policyId;
        result.policyMessageId = json.policyMessageId ?? null;
        result.recordingUuid = json.recordingUuid;
        result.recordId = json.recordId;
        result.recordActionId = json.recordActionId;
        result.method = json.method;
        result.actionName = json.actionName ?? null;
        result.time = json.time;
        result.user = json.user ?? null;
        result.target = json.target ?? null;
        result.document = json.document;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.user || null;
    }
}
