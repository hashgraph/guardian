import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { StatisticMessageBody } from './message-body.interface.js';
import { PolicyStatistic } from '../../entity/index.js';
import { IPFS } from '../../helpers/index.js';
import { IStatisticConfig } from '@guardian/interfaces';

/**
 * Schema message
 */
export class StatisticMessage extends Message {
    /**
     * Name
     */
    public name: string;
    /**
     * Description
     */
    public description: string;
    /**
     * Owner
     */
    public owner: string;
    /**
     * UUID
     */
    public uuid: string;
    /**
     * Policy topic id
     */
    public policyTopicId: string;
    /**
     * Policy Instance topic id
     */
    public policyInstanceTopicId: string;

    /**
     * Document
     */
    public config: IStatisticConfig;

    constructor(action: MessageAction) {
        super(action, MessageType.PolicyStatistic);
    }

    /**
     * Set document
     * @param item
     */
    public setDocument(item: PolicyStatistic): void {
        this.name = item.name;
        this.description = item.description;
        this.owner = item.owner;
        this.uuid = item.uuid;
        this.policyTopicId = item.policyTopicId;
        this.policyInstanceTopicId = item.policyInstanceTopicId;
        this.config = item.config;
    }

    /**
     * Get document
     */
    public getDocument(): IStatisticConfig {
        return this.config;
    }

    /**
     * To message object
     */
    public override toMessageObject(): StatisticMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            name: this.name,
            description: this.description,
            owner: this.owner,
            uuid: this.uuid,
            policyTopicId: this.policyTopicId,
            policyInstanceTopicId: this.policyInstanceTopicId,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url),
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<Buffer[]> {
        const document = JSON.stringify(this.config);
        const buffer = Buffer.from(document);
        return [buffer];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: string[]): StatisticMessage {
        if (documents && Array.isArray(documents)) {
            this.config = JSON.parse(documents[0]);
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): StatisticMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return StatisticMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: StatisticMessageBody): StatisticMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new StatisticMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.name = json.name;
        message.description = json.description;
        message.owner = json.owner;
        message.uuid = json.uuid;
        message.policyTopicId = json.policyTopicId;
        message.policyInstanceTopicId = json.policyInstanceTopicId;
        const urls = [
            {
                cid: json.cid,
                url: IPFS.IPFS_PROTOCOL + json.cid,
            },
        ];
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
        result.owner = this.owner;
        result.uuid = this.uuid;
        result.policyTopicId = this.policyTopicId;
        result.policyInstanceTopicId = this.policyInstanceTopicId;
        result.config = this.config;
    }

    public static fromJson(json: any): StatisticMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new StatisticMessage(json.action), json);
        result.name = json.name;
        result.description = json.description;
        result.owner = json.owner;
        result.uuid = json.uuid;
        result.policyTopicId = json.policyTopicId;
        result.policyInstanceTopicId = json.policyInstanceTopicId;
        result.config = json.config;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.owner;
    }
}
