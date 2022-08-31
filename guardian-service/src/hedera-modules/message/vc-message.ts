import { VcDocument } from './../vcjs/vc-document';
import { Message } from './message';
import { IURL, UrlType } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { VcMessageBody } from './message-body.interface';

/**
 * VC message
 */
export class VCMessage extends Message {
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
     * Document status
     */
    public documentStatus: string;

    constructor(action: MessageAction) {
        super(action, MessageType.VCDocument);
    }

    /**
     * Set Document status
     * @param status
     */
    public setDocumentStatus(status: string): void {
        this.documentStatus = status;
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
     * Set relationships
     * @param ids
     */
    public setRelationships(ids: string[]): void {
        this.relationships = ids;
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
    public override toMessageObject(): VcMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            issuer: this.issuer,
            relationships: this.relationships,
            cid: this.getDocumentUrl(UrlType.cid),
            url: this.getDocumentUrl(UrlType.url),
            documentStatus: this.documentStatus
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<ArrayBuffer[]> {
        const json = JSON.stringify(this.document);
        const buffer = Buffer.from(json);
        return [buffer];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: string[]): VCMessage {
        this.document = JSON.parse(documents[0]);
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): VCMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return VCMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: VcMessageBody): VCMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new VCMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.issuer = json.issuer;
        message.relationships = json.relationships;
        const urls = [{
            cid: json.cid,
            url: json.url
        }]
        message.setUrls(urls);
        return message;
    }

    /**
     * Get URL
     */
    public override getUrl(): IURL {
        return this.urls[0];
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
}
