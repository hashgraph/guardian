import { VcDocument } from '../vcjs/vc-document.js';
import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { StatisticAssessmentMessageBody } from './message-body.interface.js';
import { IPFS } from '../../helpers/index.js';
import { PolicyStatistic } from '../../entity/index.js';

/**
 * VC message
 */
export class StatisticAssessmentMessage extends Message {
    /**
     * VC document
     */
    public vcDocument: VcDocument;
    /**
     * Document
     */
    public document: any;
    /**
     * Hash
     */
    public hash: string;
    /**
     * Issuer
     */
    public issuer: string;
    /**
     * Relationships
     */
    public relationships: string[];
    /**
     * Target
     */
    public target: string;
    /**
     * Definition
     */
    public definition: string;

    constructor(
        action: MessageAction,
        type: MessageType = MessageType.VCDocument
    ) {
        super(action, type);
    }

    /**
     * Set document
     * @param document
     */
    public setDocument(document: VcDocument): void {
        this.vcDocument = document;
        this.document = document.getDocument();
        this.hash = document.toCredentialHash();
        this.issuer = document.getIssuerDid();
    }

    /**
     * Set target
     * @param id
     */
    public setTarget(id: string): void {
        this.target = id;
    }

    /**
     * Set relationships
     * @param ids
     */
    public setRelationships(ids: string[]): void {
        this.relationships = Array.from(new Set(ids));
    }

    /**
     * Set target
     * @param id
     */
    public setDefinition(definition: PolicyStatistic): void {
        this.definition = definition.messageId;
    }

    /**
     * Get documents
     */
    public getDocument(): any {
        return this.document;
    }

    /**
     * To message object
     */
    public override toMessageObject(): StatisticAssessmentMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            issuer: this.issuer,
            relationships: this.relationships,
            target: this.target,
            definition: this.definition,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url),
        };
    }

    /**
     * To documents
     */
    public async toDocuments(key: string): Promise<Buffer[]> {
        const document = JSON.stringify(this.document);
        const buffer = Buffer.from(document);
        return [buffer];
    }

    /**
     * Load documents
     * @param documents
     */
    public async loadDocuments(documents: string[]): Promise<StatisticAssessmentMessage> {
        this.document = JSON.parse(documents[0]);
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): StatisticAssessmentMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return StatisticAssessmentMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: StatisticAssessmentMessageBody): StatisticAssessmentMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new StatisticAssessmentMessage(json.action, json.type);
        message = StatisticAssessmentMessage._fromMessageObject(message, json);
        return message;
    }

    /**
     * From message object
     * @param message
     * @param json
     */
    protected static override _fromMessageObject<T extends Message>(
        message: T, json: StatisticAssessmentMessageBody
    ): T {
        const _message: StatisticAssessmentMessage = super._fromMessageObject(message, json) as any;
        _message._id = json.id;
        _message._status = json.status;
        _message.issuer = json.issuer;
        _message.relationships = json.relationships;
        _message.target = json.target;
        _message.definition = json.definition;
        const urls = [
            {
                cid: json.cid,
                url: IPFS.IPFS_PROTOCOL + json.cid,
            },
        ];
        _message.setUrls(urls);
        return _message as any;
    }

    /**
     * Get URL
     */
    public override getUrl(): IURL {
        return this.getUrls()[0];
    }

    /**
     * Validate
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
     * Relationship message
     */
    public getRelationships(): string[] {
        return this.relationships || [];
    }

    /**
     * Target message
     */
    public getTarget(): string {
        return this.target;
    }

    /**
     * Definition message
     */
    public getDefinition(): string {
        return this.definition;
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.issuer = this.issuer;
        result.hash = this.hash;
        result.relationships = this.relationships;
        result.target = this.target;
        result.definition = this.definition;
        result.document = this.document;
        return result;
    }

    public static fromJson(json: any): StatisticAssessmentMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new StatisticAssessmentMessage(json.action), json);
        result.issuer = json.issuer;
        result.hash = json.hash;
        result.relationships = json.relationships;
        result.target = json.target;
        result.definition = json.definition;
        result.document = json.document;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.issuer;
    }
}
