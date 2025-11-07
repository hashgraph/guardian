import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { PolicyDiffMessageBody } from './message-body.interface.js';
import { IPFS, toBuffer } from '../../helpers/index.js';

/**
 * Policy diff message
 */
export class PolicyDiffMessage extends Message {
    /**
     * Document
     */
    public document: Buffer;
    /**
     * UUID
     */
    public uuid: string;
    /**
     * Owner
     */
    public owner: string;
    /**
     * Diff type
     */
    public diffType: 'backup' | 'diff' | 'keys';
    /**
     * Diff index
     */
    public diffIndex: number;
    /**
     * Policy topic ID
     * @private
     */
    public policyTopicId: string;
    /**
     * Instance topic ID
     */
    public instanceTopicId: string;

    constructor(
        type: MessageType.PolicyDiff,
        action: MessageAction
    ) {
        super(action, type);
        this._responseType = 'raw';
        this.setUrls([]);
    }

    /**
     * Set document
     * @param model
     * @param zip
     */
    public setDocument(diff: any, zip?: ArrayBuffer | Buffer): void {
        this.uuid = diff.uuid;
        this.owner = diff.owner;
        this.diffType = diff.diffType;
        this.diffIndex = diff.diffIndex;
        this.policyTopicId = diff.policyTopicId;
        this.instanceTopicId = diff.instanceTopicId;
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
    public override toMessageObject(): PolicyDiffMessageBody {
        const messageObject: any = {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            uuid: this.uuid,
            owner: this.owner,
            diffType: this.diffType,
            diffIndex: this.diffIndex,
            policyTopicId: this.policyTopicId?.toString(),
            instanceTopicId: this.instanceTopicId?.toString(),
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url)
        };
        return messageObject;
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
    public loadDocuments(documents: any[]): PolicyDiffMessage {
        if (documents && documents.length === 1) {
            this.document = Buffer.from(documents[0]);
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): PolicyDiffMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return PolicyDiffMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: PolicyDiffMessageBody): PolicyDiffMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.PolicyDiff) {
            throw new Error('Invalid message type')
        }

        let message = new PolicyDiffMessage(json.type, json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.uuid = json.uuid;
        message.owner = json.owner;
        message.diffType = json.diffType;
        message.diffIndex = json.diffIndex;
        message.policyTopicId = json.policyTopicId;
        message.instanceTopicId = json.instanceTopicId;
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
        result.owner = this.owner;
        result.diffType = this.diffType;
        result.diffIndex = this.diffIndex;
        result.policyTopicId = this.policyTopicId;
        result.instanceTopicId = this.instanceTopicId;
        result.document = this.document;
        return result;
    }

    public static fromJson(json: any): PolicyDiffMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new PolicyDiffMessage(json.type, json.action), json);
        result.uuid = json.uuid;
        result.owner = json.owner;
        result.diffType = json.diffType;
        result.diffIndex = json.diffIndex;
        result.policyTopicId = json.policyTopicId;
        result.instanceTopicId = json.instanceTopicId;
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
